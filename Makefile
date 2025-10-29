.PHONY: daopad_backend daopad_invoices admin help

# Deploy Daopad backend canister
daopad_backend:
	@echo "Deploying Daopad backend canister..."
	dfx canister create daopad_backend --specified-id lwsav-iiaaa-aaaap-qp2qq-cai
	cargo build --release --target wasm32-unknown-unknown --package daopad_backend
	candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > src/daopad/daopad_backend/daopad_backend.did
	dfx generate daopad_backend
	cp -r src/declarations/daopad_backend src/daopad/daopad_frontend/src/declarations/
	dfx deploy daopad_backend --argument "(opt \"fec7w-zyaaa-aaaaa-qaffq-cai\")"

# Deploy Daopad invoices canister
daopad_invoices:
	@echo "Deploying Daopad invoices canister..."
	dfx canister create daopad_invoices --specified-id heuuj-6aaaa-aaaag-qc6na-cai
	cargo build --release --target wasm32-unknown-unknown --package daopad_invoices
	candid-extractor target/wasm32-unknown-unknown/release/daopad_invoices.wasm > src/daopad/daopad_invoices/daopad_invoices.did
	dfx deploy daopad_invoices
	dfx generate daopad_invoices
	cp -r src/declarations/daopad_invoices src/daopad/daopad_frontend/src/declarations/

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
