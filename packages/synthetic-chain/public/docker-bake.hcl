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
  tags = ["ghcr.io/agoric/agoric-3-proposals:use-${proposal}"]
  labels = {
    "org.opencontainers.image.title": "Use ${proposal}",
    "org.opencontainers.image.description": "Use agoric-3 synthetic chain after ${proposal} proposal",
  }
  target = "use-${proposal}"
}

// Image to prepare for a Software Upgrade with historical state.
target "prepare" {
  inherits = ["docker-metadata-action"]
  name = "prepare-${proposal}"
  platforms = PLATFORMS
  matrix = {
    proposal = PROPOSALS
  }
  // TODO proposal *number* would be immutable
  tags = ["ghcr.io/agoric/agoric-3-proposals:prepare-${proposal}"]
  labels = {
    "org.opencontainers.image.title": "Prepare ${proposal}",
    "org.opencontainers.image.description": "Prepare for the upgrade to ${proposal} proposal",
  }
  target = "prepare-${proposal}"
}

// Image to test the result of a proposal, always current platform
target "test" {
  name = "test-${proposal}"
  matrix = {
    proposal = PROPOSALS
  }
  tags = ["ghcr.io/agoric/agoric-3-proposals:test-${proposal}"]
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
  tags = ["ghcr.io/agoric/agoric-3-proposals:latest"]
  labels = {
    "org.opencontainers.image.title": "All passed proposals",
    "org.opencontainers.image.description": "Use agoric-3 synthetic chain including all passed proposals",
  }
}
