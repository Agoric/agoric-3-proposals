#!/bin/bash
set -e
echo check for USDC in psm pairs
agd query vstorage children published.psm.IST | grep USDC
