// Auto-generated declarations for daopad_invoices canister
import { Actor, HttpAgent } from "@dfinity/agent";

export const idlFactory = ({ IDL }) => {
  const Collateral = IDL.Variant({ 'ICP': IDL.Null, 'ckUSDT': IDL.Null });
  const InvoiceStatus = IDL.Variant({
    'Paid': IDL.Null,
    'Inactive': IDL.Null,
    'Unpaid': IDL.Null,
  });
  const Invoice = IDL.Record({
    'id': IDL.Text,
    'url': IDL.Text,
    'status': InvoiceStatus,
    'fiat': IDL.Nat64,
    'collateral': Collateral,
    'description': IDL.Text,
    'created_at': IDL.Nat64,
    'crypto': IDL.Nat64,
    'orbit_account_id': IDL.Text,
    'treasury_owner': IDL.Principal,
    'treasury_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Result = IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text });
  const HttpRequest = IDL.Record({
    'url': IDL.Text,
    'method': IDL.Text,
    'body': IDL.Vec(IDL.Nat8),
    'headers': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });
  const HttpResponse = IDL.Record({
    'body': IDL.Vec(IDL.Nat8),
    'headers': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'upgrade': IDL.Opt(IDL.Bool),
    'status_code': IDL.Nat16,
  });
  const HttpHeader = IDL.Record({ 'value': IDL.Text, 'name': IDL.Text });
  const HttpResponse_1 = IDL.Record({
    'status': IDL.Nat,
    'body': IDL.Vec(IDL.Nat8),
    'headers': IDL.Vec(HttpHeader),
  });
  const TransformArgs = IDL.Record({
    'context': IDL.Vec(IDL.Nat8),
    'response': HttpResponse_1,
  });

  return IDL.Service({
    'create_invoice': IDL.Func([IDL.Nat64, IDL.Text, IDL.Opt(IDL.Text), IDL.Principal, IDL.Text, IDL.Text], [IDL.Text], []),
    'get_canister_ckusdt_balance': IDL.Func([], [Result], []),
    'get_canister_icp_balance': IDL.Func([], [Result], []),
    'get_ckusdt_balance': IDL.Func([IDL.Principal], [Result], []),
    'get_icp_balance': IDL.Func([IDL.Principal], [Result], []),
    'get_invoice_by_payment_id': IDL.Func([IDL.Text], [IDL.Opt(IDL.Tuple(IDL.Principal, Invoice))], ['query']),
    'get_invoices_for_principal_query': IDL.Func([IDL.Principal], [IDL.Vec(Invoice)], ['query']),
    'get_my_invoices': IDL.Func([], [IDL.Vec(Invoice)], ['query']),
    'get_stripe_api_secret_info': IDL.Func([], [IDL.Text], ['query']),
    'get_stripe_webhook_secret_info': IDL.Func([], [IDL.Text], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
    'http_request': IDL.Func([HttpRequest], [HttpResponse], ['query']),
    'http_request_update': IDL.Func([HttpRequest], [HttpResponse], []),
    'list_all_invoices': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Vec(Invoice)))], ['query']),
    'test_send_ckusdt': IDL.Func([], [Result_1], []),
    'transform_first': IDL.Func([TransformArgs], [HttpResponse], ['query']),
    'transform_second': IDL.Func([TransformArgs], [HttpResponse], ['query']),
    'update_stripe_api_secret': IDL.Func([IDL.Text], [Result_1], []),
    'update_stripe_webhook_secret': IDL.Func([IDL.Text], [Result_1], []),
    'whoami': IDL.Func([], [IDL.Text], ['query']),
  });
};

export const canisterId = process.env.CANISTER_ID_DAOPAD_INVOICES || 'heuuj-6aaaa-aaaag-qc6na-cai';

export const createActor = (canisterId, options = {}) => {
  const agent = options.agent || new HttpAgent({ ...options.agentOptions });

  if (options.agent && options.agentOptions) {
    console.warn(
      "Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent."
    );
  }

  // Fetch root key for certificate validation during development
  if (process.env.DFX_NETWORK !== "ic") {
    agent.fetchRootKey().catch((err) => {
      console.warn(
        "Unable to fetch root key. Check to ensure that your local replica is running"
      );
      console.error(err);
    });
  }

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
};

export const daopad_invoices = canisterId ? createActor(canisterId) : undefined;
