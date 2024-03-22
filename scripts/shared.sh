# Shared logic for scripts
set -e

# Cd to repo root
cd "$(dirname "${BASH_SOURCE[0]}")/.."


container() {
    if command -v podman &>/dev/null; then
        podman "$@"
    elif command -v docker &>/dev/null; then
        docker "$@"
    else
        echo "Please install either docker or podman"
        exit 1
    fi
}
