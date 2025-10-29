.PHONY: daopad_backend admin help

# Deploy Daopad backend canister
daopad_backend:
	@echo "Deploying Daopad backend canister..."
	dfx canister create daopad_backend --specified-id lwsav-iiaaa-aaaap-qp2qq-cai
	cargo build --release --target wasm32-unknown-unknown --package daopad_backend
	candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
	dfx generate daopad_backend
	cp -r src/declarations/daopad_backend src/daopad/daopad_frontend/src/declarations/
	dfx deploy daopad_backend --argument "(opt \"fec7w-zyaaa-aaaaa-qaffq-cai\")";

# Deploy Admin canister
admin:
	@echo "Deploying ADMIN canister..."
	dfx canister create admin --specified-id odkrm-viaaa-aaaap-qp2oq-cai
	cargo build --release --target wasm32-unknown-unknown --package admin
	candid-extractor target/wasm32-unknown-unknown/release/admin.wasm > src/daopad/admin/admin.did
	dfx generate admin
	cp -r src/declarations/admin src/daopad/daopad_frontend/src/declarations/
	dfx deploy admin --specified-id uf6dk-hyaaa-aaaaq-qaaaq-cai

all: daopad_backend admin

# Help target
help:
	@echo "Available targets:"
	@echo "  daopad_backend      - Deploy DAOPAD canister"
	@echo "  admin               - Deploy ADMIN canister"
