#! /usr/bin/env bash

ACCESS_TOKEN_URI="https://oauth2.googleapis.com/token"
BUCKET_NAME="agoric-snapshots-public"
CONTAINER_MEMORY="200GiB"
IMAGE_TAG="${IMAGE_TAG:-"57"}"
FIRST_NODE_DATA_FOLDER_NAME="agoric1"
FIRST_NODE_IP="10.99.0.2"
PARENT_FOLDER="/var/lib/google/code"
PROJECT_NAME="simulationlab"
REGION="us-central1-a"
REPOSITORY_URL="https://github.com/agoric-labs/cosmos-genesis-tinkerer.git"
STORAGE_WRITE_SCOPES="https://www.googleapis.com/auth/devstorage.read_write"
SECOND_NODE_DATA_FOLDER_NAME="agoric2"
SECOND_NODE_IP="10.99.0.3"
STORAGE_UPLOAD_URL="https://storage.googleapis.com/upload/storage/v1/b"
TIMESTAMP="$(date '+%s')"
VALIDATOR_STATE_FILE_NAME="priv_validator_state.json"
VM_NAME="jump-3"
VM_OPERATIONS_SCOPES="https://www.googleapis.com/auth/cloud-platform"
VM_RUNNING_STATUS="RUNNING"
VM_STOPPED_STATUS="TERMINATED"

FIRST_NODE_LOGS_FILE="/tmp/$FIRST_NODE_DATA_FOLDER_NAME.logs"
IMAGE_NAME="ghcr.io/agoric/agoric-sdk:$IMAGE_TAG"
LOGS_FILE="/tmp/$TIMESTAMP.logs"
REPOSITORY_FOLDER_NAME="tinkerer_$TIMESTAMP"
SECOND_NODE_LOGS_FILE="/tmp/$SECOND_NODE_DATA_FOLDER_NAME.logs"
STORAGE_WRITE_SERVICE_ACCOUNT_JSON_FILE_PATH="$PARENT_FOLDER/chain-snapshot-writer.json"
VM_ADMIN_SERVICE_ACCOUNT_JSON_FILE_PATH="$PARENT_FOLDER/vm-admin.json"

execute_command_inside_vm() {
    local command="$1"
    gcloud compute ssh "$VM_NAME" \
        --command "$command" --project "$PROJECT_NAME" --zone "$REGION"
}

get_vm_status() {
    gcloud compute instances describe "$VM_NAME" \
        --format "value(status)" --project "$PROJECT_NAME" --zone "$REGION"
}

log_warning() {
    printf "\033[33m%s\033[0m\n" "$1"
}

signal_vm_start() {
    gcloud compute instances start "$VM_NAME" \
        --async --project "$PROJECT_NAME" --zone "$REGION" >/dev/null 2>&1
}

start_vm() {
    if test "$(get_vm_status)" = "$VM_STOPPED_STATUS"; then
        log_warning "Starting VM $VM_NAME"
        signal_vm_start
        wait_for_vm_status "$VM_RUNNING_STATUS"
    else
        log_warning "VM $VM_NAME already running"
    fi
}

wait_for_vm_status() {
    local status="$1"
    while [ "$(get_vm_status)" != "$status" ]; do
        sleep 5
    done
}

start_vm
execute_command_inside_vm "
    #! /bin/bash

    set -o errexit -o errtrace

    clone_repository() {
        git clone $REPOSITORY_URL $REPOSITORY_FOLDER_NAME
    }
    compress_folders() {
        local first_chain_folder=state/mainfork/$FIRST_NODE_DATA_FOLDER_NAME
        local second_chain_folder=state/mainfork/$SECOND_NODE_DATA_FOLDER_NAME

        local folder_size=\$(sudo du --human-readable --null --summarize \$first_chain_folder | awk '{printf \"%s\", \$1}')

        sudo mv \$first_chain_folder/data/$VALIDATOR_STATE_FILE_NAME state/$VALIDATOR_STATE_FILE_NAME
        sudo chmod 666 state/$VALIDATOR_STATE_FILE_NAME

        echo \"Compressing data folder of size \$folder_size\"
        sudo tar --create --file state/mainfork_data_$TIMESTAMP.tar.gz --directory \$first_chain_folder --gzip data
        sudo tar --create --file state/mainfork_${FIRST_NODE_DATA_FOLDER_NAME}_config_$TIMESTAMP.tar.gz --directory \$first_chain_folder --gzip config
        sudo tar --create --file state/mainfork_${SECOND_NODE_DATA_FOLDER_NAME}_config_$TIMESTAMP.tar.gz --directory \$second_chain_folder --gzip config
        sudo tar --create --file state/keyring-test.tar.gz --directory \$first_chain_folder --gzip keyring-test

        sudo chmod 666 state/mainfork_data_$TIMESTAMP.tar.gz
        sudo chmod 666 state/mainfork_${FIRST_NODE_DATA_FOLDER_NAME}_config_$TIMESTAMP.tar.gz
        sudo chmod 666 state/mainfork_${SECOND_NODE_DATA_FOLDER_NAME}_config_$TIMESTAMP.tar.gz
        sudo chmod 666 state/keyring-test.tar.gz
    }
    create_log_files() {
        touch $FIRST_NODE_LOGS_FILE $SECOND_NODE_LOGS_FILE
    }
    export_genesis() {
        docker run \
         --entrypoint /scripts/export.sh \
         --volume $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME/scripts:/scripts:rw \
         --volume $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME/state/mainnet/agoric:/root/agoric:rw \
         $IMAGE_NAME
    }
    get_access_token() {
        local client_email
        local private_key
        local scopes
        local service_account_json_file_path

        scopes=\"\$1\"
        service_account_json_file_path=\"\$2\"

        private_key=\"\$(jq -r \".private_key\" \"\$service_account_json_file_path\" | sed \"s/\\\\n/\\n/g\")\"
        client_email=\"\$(jq -r \".client_email\" \"\$service_account_json_file_path\")\"

        local iat
        local exp
        iat=\"\$(date +%s)\"
        exp=\$(( iat + 3600 ))

        local header_base64
        local claim_base64
        local to_sign
        local signature
        local jwt

        header_base64=\"\$( \\
            echo -n '{\"alg\":\"RS256\",\"typ\":\"JWT\"}' \\
            | openssl base64 -e \\
            | tr -d '=\\n' \\
            | sed 's/+/-/g; s|/|_|g' \\
        )\"

        claim_base64=\"\$( \\
            echo -n '{\"iss\":\"'\${client_email}'\",\"scope\":\"'\$scopes'\",\"aud\":\"$ACCESS_TOKEN_URI\",\"exp\":'\${exp}',\"iat\":'\${iat}'}' \\
            | openssl base64 -e \\
            | tr -d '=\\n' \\
            | sed 's/+/-/g; s|/|_|g' \\
        )\"

        to_sign=\"\${header_base64}.\${claim_base64}\"

        signature=\"\$( \\
            echo -n \"\$to_sign\" \\
            | openssl dgst -sha256 -sign <(echo \"\$private_key\") \\
            | openssl base64 -e \\
            | tr -d '=\\n' \\
            | sed 's/+/-/g; s|/|_|g' \\
        )\"

        jwt=\"\${to_sign}.\${signature}\"

        local response
        response=\"\$(curl -s -X POST \\
            -d \"grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer\" \\
            -d \"assertion=\${jwt}\" \\
            \"$ACCESS_TOKEN_URI\")\"

        local token
        token=\"\$(echo \"\$response\" | jq -r \".access_token\")\"

        echo \"\$token\"
    }
    main() {
        cd $PARENT_FOLDER
        clone_repository
        cd $REPOSITORY_FOLDER_NAME
        restore_from_state_sync
        export_genesis
        tinker_genesis
        remove_extra_files
        remove_all_running_containers
        create_log_files
        start_mainfork_node $FIRST_NODE_DATA_FOLDER_NAME $FIRST_NODE_IP > $FIRST_NODE_LOGS_FILE 2>&1 &
        start_mainfork_node $SECOND_NODE_DATA_FOLDER_NAME $SECOND_NODE_IP > $SECOND_NODE_LOGS_FILE 2>&1 &
        wait_for_some_block_commits $FIRST_NODE_LOGS_FILE
        wait_for_some_block_commits $SECOND_NODE_LOGS_FILE
        remove_all_running_containers
        compress_folders
        upload_file_to_storage $BUCKET_NAME mainfork-snapshots/agoric_$TIMESTAMP.tar.gz state/mainfork_data_$TIMESTAMP.tar.gz
        upload_file_to_storage $BUCKET_NAME mainfork-snapshots/${FIRST_NODE_DATA_FOLDER_NAME}_config_$TIMESTAMP.tar.gz state/mainfork_${FIRST_NODE_DATA_FOLDER_NAME}_config_$TIMESTAMP.tar.gz
        upload_file_to_storage $BUCKET_NAME mainfork-snapshots/${SECOND_NODE_DATA_FOLDER_NAME}_config_$TIMESTAMP.tar.gz state/mainfork_${SECOND_NODE_DATA_FOLDER_NAME}_config_$TIMESTAMP.tar.gz
        upload_file_to_storage $BUCKET_NAME mainfork-snapshots/$VALIDATOR_STATE_FILE_NAME state/$VALIDATOR_STATE_FILE_NAME
        upload_file_to_storage $BUCKET_NAME mainfork-snapshots/keyring-test.tar.gz state/keyring-test.tar.gz
        remove_repository
        stop_vm
    }
    remove_all_running_containers() {
        docker container ls --all --format '{{.ID}}' | \
        xargs -I {} docker container stop {} | \
        xargs -I {} docker container rm {} --force --volumes
    }
    remove_extra_files() {
        sudo rm --force \
         state/mainfork/$FIRST_NODE_DATA_FOLDER_NAME/data/agoric/flight-recorder.bin \
         state/mainfork/$SECOND_NODE_DATA_FOLDER_NAME/data/agoric/flight-recorder.bin
    }
    remove_repository() {
        cd \$HOME
        sudo rm --force --recursive $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME
    }
    restore_from_state_sync() {
        docker run \
         --entrypoint /scripts/state_sync.sh \
         --volume $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME/scripts:/scripts:rw \
         --volume $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME/state/mainnet/agoric:/root/agoric:rw \
         $IMAGE_NAME
    }
    start_mainfork_node() {
        local node_data_folder_name=\$1
        local node_ip=\$2

        docker run \
         --ip \$node_ip \
         --memory $CONTAINER_MEMORY  \
         --mount 'type=tmpfs,destination=/tmp' \
         --name \$node_data_folder_name  \
         --network forknet \
         --volume $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME/state/mainfork:/state:rw \
         $IMAGE_NAME \
         start --home /state/\$node_data_folder_name
    }
    stop_vm() {
        local access_token=\"\$(get_access_token \"$VM_OPERATIONS_SCOPES\" \"$VM_ADMIN_SERVICE_ACCOUNT_JSON_FILE_PATH\")\"
        curl \"https://compute.googleapis.com/compute/v1/projects/$PROJECT_NAME/zones/$REGION/instances/$VM_NAME/stop\" \
        --header \"Authorization: Bearer \$access_token\" \
        --header \"Content-Type: application/json\" \
        --output /dev/null \
        --request POST \
        --silent
    }
    tinker_genesis() {
        docker run \
         --entrypoint /tinkerer/scripts/tinkerer.sh \
         --volume $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME/state/mainfork:/state:rw \
         --volume $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME/state/mainnet/agoric/export:/export:rw \
         --volume $PARENT_FOLDER/$REPOSITORY_FOLDER_NAME:/tinkerer:rw \
         $IMAGE_NAME
    }
    upload_file_to_storage() {
        local access_token=\"\$(get_access_token \"$STORAGE_WRITE_SCOPES\" \"$STORAGE_WRITE_SERVICE_ACCOUNT_JSON_FILE_PATH\")\"
        local bucket_name=\$1
        local object_name=\$2
        local file_path=\$3

        echo \"Uploading file \$file_path to bucket \$bucket_name on path \$object_name\"

        local http_code=\$(
            curl \"$STORAGE_UPLOAD_URL/\$bucket_name/o?name=\$object_name&uploadType=media\" \
            --header \"Authorization: Bearer \$access_token\" \
            --output /dev/null \
            --request POST \
            --silent \
            --upload-file \$file_path \
            --write-out \"%{http_code}\"
        )

        if [ ! \$http_code -eq 200 ]
        then
            echo \"Failed to upload file\"
            exit 1
        fi
    }
    wait_for_some_block_commits() {
        local log_file_path=\$1
        tail --lines +1 --follow \$log_file_path | \
        grep --extended-regexp 'block [0-9]+ commit' --max-count 5
    }

    main > $LOGS_FILE 2>&1 &
"
