// If you're new to Bake:
// https://blog.kubesimplify.com/bake-your-container-images-with-bake

// for https://github.com/docker/metadata-action?tab=readme-ov-file#bake-definition
target "docker-metadata-action" {}

// PROPOSALS variable is filled by docker-bake.json, which this config merges upon
// https://docs.docker.com/build/bake/reference/#file-format

group "default" {
  targets = [
    "use",
    "test"
  ]
}

// Images to use the result of all local proposals, optionally built multi-platform
target "use" {
  inherits = ["docker-metadata-action"]
  name = "use-${proposal}"
  platforms = PLATFORMS
  matrix = {
    proposal = PROPOSALS
  }
  // TODO proposal *number* would be immutable
  tags = ["${REPOSITORY_COLON}use-${proposal}"]
  labels = {
    "org.opencontainers.image.title": "Use ${proposal}",
    "org.opencontainers.image.description": "Use agoric-3 synthetic chain after ${proposal} proposal",
  }
  target = "use-${proposal}"
}

// Image to test the result of a proposal, always current platform
target "test" {
  name = "test-${proposal}"
  matrix = {
    proposal = PROPOSALS
  }
  tags = ["${REPOSITORY_COLON}test-${proposal}"]
  labels = {
    "org.opencontainers.image.title": "Test ${proposal}",
  }
  target = "test-${proposal}"
}

// Single image for using the chain with the state after all the passed proposals
// Must match the CI config and synthetic-chain default fromTag
target "latest" {
  inherits = ["docker-metadata-action"]
  platforms = PLATFORMS
  tags = ["${REPOSITORY_COLON}latest"]
  labels = {
    "org.opencontainers.image.title": "All passed proposals",
    "org.opencontainers.image.description": "Use agoric-3 synthetic chain including all passed proposals",
  }
}
