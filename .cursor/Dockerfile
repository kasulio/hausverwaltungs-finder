FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        unzip \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Bun runtime (repo uses bun as its package manager and runtime).
# Installed globally so it is on PATH for install, start, and terminals.
ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14" \
    && ln -sf /usr/local/bin/bun /usr/local/bin/bunx \
    && bun --version

# ubuntu:24.04 ships a non-root `ubuntu` user (uid 1000); Cursor runs as it.
USER ubuntu
