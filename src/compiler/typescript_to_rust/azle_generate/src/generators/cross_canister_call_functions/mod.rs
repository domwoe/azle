use cdk_framework::{ToActDataType, ToTokenStream, ToTokenStreams};
use proc_macro2::{Ident, TokenStream};
use quote::{format_ident, quote};
use swc_common::SourceMap;
use swc_ecma_ast::{Expr, TsMethodSignature, TsType, TsTypeElement, TsTypeLit};

use crate::{
    ts_ast::{
        azle_method_signature::AzleMethodSignature, azle_type::AzleType, AzleTypeAliasDecl, GetName,
    },
    ts_keywords,
};

#[derive(Clone)]
pub struct CrossCanisterCallFunctionsInfo {
    pub call: CrossCanisterCallFunctionInfo,
    pub call_with_payment: CrossCanisterCallFunctionInfo,
    pub call_with_payment128: CrossCanisterCallFunctionInfo,
    pub notify: CrossCanisterCallFunctionInfo,
    pub notify_with_payment128: CrossCanisterCallFunctionInfo,
}

#[derive(Clone)]
pub struct CrossCanisterCallFunctionInfo {
    pub name: String,
    pub rust_params: RustParams,
    pub rust: TokenStream,
}

#[derive(Clone)]
pub struct RustParams {
    pub params: Vec<TokenStream>,
    pub param_names: Vec<Ident>,
    pub param_types: Vec<TokenStream>,
}

struct CrossCanisterCallFunctionNames {
    call_function_name: String,
    call_with_payment_function_name: String,
    call_with_payment128_function_name: String,
    notify_function_name: String,
    notify_with_payment128_function_name: String,
}

pub trait GenerateCrossCanisterCallFunctionsInfos {
    fn generate_cross_canister_call_functions_infos(&self) -> Vec<CrossCanisterCallFunctionsInfo>;
}

impl GenerateCrossCanisterCallFunctionsInfos for Vec<AzleTypeAliasDecl<'_>> {
    fn generate_cross_canister_call_functions_infos(&self) -> Vec<CrossCanisterCallFunctionsInfo> {
        self.iter().fold(vec![], |acc, canister_type_alias_decl| {
            let cross_canister_call_functions_infos =
                canister_type_alias_decl.generate_cross_canister_call_functions_infos();

            vec![acc, cross_canister_call_functions_infos].concat()
        })
    }
}

impl GenerateCrossCanisterCallFunctionsInfos for AzleTypeAliasDecl<'_> {
    fn generate_cross_canister_call_functions_infos(&self) -> Vec<CrossCanisterCallFunctionsInfo> {
        match &*self.ts_type_alias_decl.type_ann {
            TsType::TsTypeRef(ts_type_ref) => match &ts_type_ref.type_params {
                Some(type_params) => {
                    let canister_type_alias_decl_name = self.get_name();

                    let type_param = &type_params.params[0];

                    match &**type_param {
                        TsType::TsTypeLit(ts_type_lit) => {
                            generate_cross_canister_call_functions_infos_from_canister_type_literal(
                                ts_type_lit,
                                &canister_type_alias_decl_name,
                                self.source_map,
                            )
                        }
                        _ => panic!("The Canister type param must be a type literal"),
                    }
                }
                None => panic!("A Canister type must have one type param"),
            },
            _ => panic!("A Canister type must be a TsTypeRef"),
        }
    }
}

fn generate_cross_canister_call_functions_infos_from_canister_type_literal(
    canister_type_literal_node: &TsTypeLit,
    canister_type_alias_decl_name: &str,
    source_map: &SourceMap,
) -> Vec<CrossCanisterCallFunctionsInfo> {
    canister_type_literal_node
        .members
        .iter()
        .map(|member| {
            generate_cross_canister_call_functions_info_from_canister_type_element(
                member,
                canister_type_alias_decl_name,
                source_map,
            )
        })
        .collect()
}

fn generate_cross_canister_call_functions_info_from_canister_type_element(
    canister_type_element: &TsTypeElement,
    canister_type_alias_decl_name: &str,
    source_map: &SourceMap,
) -> CrossCanisterCallFunctionsInfo {
    match canister_type_element {
        TsTypeElement::TsMethodSignature(ts_method_signature) => {
            let cross_canister_call_function_names = get_cross_canister_call_function_names(
                ts_method_signature,
                canister_type_alias_decl_name,
            );

            let call_params = get_ts_method_signature_rust_params(ts_method_signature, source_map);
            let function_return_type =
                get_ts_method_signature_return_type(ts_method_signature, source_map);

            let method_name = get_method_name(ts_method_signature);

            let call_rust = generate_call_rust(
                &cross_canister_call_function_names.call_function_name,
                &method_name,
                &function_return_type,
                &call_params,
            );

            let call_with_payment_rust = generate_call_with_payment_rust(
                &cross_canister_call_function_names.call_with_payment_function_name,
                &method_name,
                &function_return_type,
                &call_params,
            );

            let call_with_payment128_rust = generate_call_with_payment128_rust(
                &cross_canister_call_function_names.call_with_payment128_function_name,
                &method_name,
                &function_return_type,
                &call_params,
            );

            let notify_rust = generate_notify_rust(
                &cross_canister_call_function_names.notify_function_name,
                &method_name,
                &call_params,
            );

            let notify_with_payment128_rust = generate_notify_with_payment128_rust(
                &cross_canister_call_function_names.notify_with_payment128_function_name,
                &method_name,
                &call_params,
            );

            CrossCanisterCallFunctionsInfo {
                call: CrossCanisterCallFunctionInfo {
                    name: cross_canister_call_function_names.call_function_name,
                    rust_params: call_params.clone(),
                    rust: call_rust,
                },
                call_with_payment: CrossCanisterCallFunctionInfo {
                    name: cross_canister_call_function_names.call_with_payment_function_name,
                    rust_params: call_params.clone(),
                    rust: call_with_payment_rust,
                },
                call_with_payment128: CrossCanisterCallFunctionInfo {
                    name: cross_canister_call_function_names.call_with_payment128_function_name,
                    rust_params: call_params.clone(),
                    rust: call_with_payment128_rust,
                },
                notify: CrossCanisterCallFunctionInfo {
                    name: cross_canister_call_function_names.notify_function_name,
                    rust_params: call_params.clone(),
                    rust: notify_rust,
                },
                notify_with_payment128: CrossCanisterCallFunctionInfo {
                    name: cross_canister_call_function_names.notify_with_payment128_function_name,
                    rust_params: call_params,
                    rust: notify_with_payment128_rust,
                },
            }
        }
        _ => panic!("Canister methods must be method signatures"),
    }
}

fn get_cross_canister_call_function_names(
    ts_method_signature: &TsMethodSignature,
    canister_type_alias_decl_name: &str,
) -> CrossCanisterCallFunctionNames {
    let method_name = get_method_name(ts_method_signature);

    CrossCanisterCallFunctionNames {
        call_function_name: format!(
            "_azle_call_{}_{}",
            canister_type_alias_decl_name, &method_name
        ),
        call_with_payment_function_name: format!(
            "_azle_call_with_payment_{}_{}",
            canister_type_alias_decl_name, &method_name
        ),
        call_with_payment128_function_name: format!(
            "_azle_call_with_payment128_{}_{}",
            canister_type_alias_decl_name, &method_name
        ),
        notify_function_name: format!(
            "_azle_notify_{}_{}",
            canister_type_alias_decl_name, &method_name
        ),
        notify_with_payment128_function_name: format!(
            "_azle_notify_with_payment128_{}_{}",
            canister_type_alias_decl_name, &method_name
        ),
    }
}

fn get_method_name(ts_method_signature: &TsMethodSignature) -> String {
    match &*ts_method_signature.key {
        Expr::Ident(ident) => ident.get_name().to_string(),
        _ => panic!("This should have been impossible. We expected your method name to be an Identifier, but it's some other type of expression."),
    }
}

fn generate_call_rust(
    function_name: &str,
    method_name: &str,
    function_return_type: &TokenStream,
    rust_params: &RustParams,
) -> TokenStream {
    let function_name_ident = format_ident!("{}", function_name);

    let params = vec![
        vec![quote! { canister_id_principal: ic_cdk::export::Principal }],
        rust_params.params.clone(),
    ]
    .concat();

    let param_names = generate_tuple(&rust_params.param_names);

    quote! {
        async fn #function_name_ident(#(#params),*) -> CallResult<(#function_return_type,)> {
            ic_cdk::api::call::call(
                canister_id_principal,
                #method_name,
                #param_names
            ).await
        }
    }
}

fn generate_call_with_payment_rust(
    function_name: &str,
    method_name: &str,
    function_return_type: &TokenStream,
    rust_params: &RustParams,
) -> TokenStream {
    let function_name_ident = format_ident!("{}", function_name);

    let params = vec![
        vec![quote! { canister_id_principal: ic_cdk::export::Principal }],
        rust_params.params.clone(),
        vec![quote! { cycles: u64 }],
    ]
    .concat();

    let param_names = generate_tuple(&rust_params.param_names);

    quote! {
        async fn #function_name_ident(#(#params),*) -> CallResult<(#function_return_type,)> {
            ic_cdk::api::call::call_with_payment(
                canister_id_principal,
                #method_name,
                #param_names,
                cycles
            ).await
        }
    }
}

fn generate_call_with_payment128_rust(
    function_name: &str,
    method_name: &str,
    function_return_type: &TokenStream,
    rust_params: &RustParams,
) -> TokenStream {
    let function_name_ident = format_ident!("{}", function_name);

    let params = vec![
        vec![quote! { canister_id_principal: ic_cdk::export::Principal }],
        rust_params.params.clone(),
        vec![quote! { cycles: u128 }],
    ]
    .concat();

    let param_names = generate_tuple(&rust_params.param_names);

    quote! {
        async fn #function_name_ident(#(#params),*) -> CallResult<(#function_return_type,)> {
            ic_cdk::api::call::call_with_payment128(
                canister_id_principal,
                #method_name,
                #param_names,
                cycles
            ).await
        }
    }
}

fn generate_notify_rust(
    function_name: &str,
    method_name: &str,
    rust_params: &RustParams,
) -> TokenStream {
    let function_name_ident = format_ident!("{}", function_name);
    let param_names = generate_tuple(&rust_params.param_names);
    let param_variables = generate_param_variables(&rust_params);

    quote! {
        fn #function_name_ident(
            _this: &boa_engine::JsValue,
            _aargs: &[boa_engine::JsValue],
            _context: &mut boa_engine::Context
        ) -> boa_engine::JsResult<boa_engine::JsValue> {
            let canister_id_js_value = _aargs.get(0).unwrap().clone();
            let canister_id_principal: ic_cdk::export::Principal = canister_id_js_value.try_from_vm_value(&mut *_context).unwrap();

            let args_js_value = _aargs.get(1).unwrap().clone();
            let args_js_object = args_js_value.as_object().unwrap();

            #(#param_variables)*

            let notify_result = ic_cdk::api::call::notify(
                canister_id_principal,
                #method_name,
                #param_names
            );

            Ok(notify_result.try_into_vm_value(_context).unwrap())
        }
    }
}

fn generate_notify_with_payment128_rust(
    function_name: &str,
    method_name: &str,
    rust_params: &RustParams,
) -> TokenStream {
    let function_name_ident = format_ident!("{}", function_name);
    let param_names = generate_tuple(&rust_params.param_names);
    let param_variables = generate_param_variables(&rust_params);

    quote! {
        fn #function_name_ident(
            _this: &boa_engine::JsValue,
            _aargs: &[boa_engine::JsValue],
            _context: &mut boa_engine::Context
        ) -> boa_engine::JsResult<boa_engine::JsValue> {
            let canister_id_js_value = _aargs.get(0).unwrap().clone();
            let canister_id_principal: ic_cdk::export::Principal = canister_id_js_value.try_from_vm_value(&mut *_context).unwrap();

            let args_js_value = _aargs.get(1).unwrap().clone();
            let args_js_object = args_js_value.as_object().unwrap();

            #(#param_variables)*

            let cycles_js_value = _aargs.get(2).unwrap().clone();
            let cycles: u128 = cycles_js_value.try_from_vm_value(&mut *_context).unwrap();

            let notify_result = ic_cdk::api::call::notify_with_payment128(
                canister_id_principal,
                #method_name,
                #param_names,
                cycles
            );

            Ok(notify_result.try_into_vm_value(_context).unwrap())
        }
    }
}

fn get_ts_method_signature_return_type(
    ts_method_signature: &TsMethodSignature,
    source_map: &SourceMap,
) -> TokenStream {
    // TODO: This should be handled in the same way that we handle these same sorts of errors on
    // regular canister methods. So we should be able to re-use code here.
    let ts_type_ann = &*ts_method_signature.type_ann.as_ref().unwrap().type_ann; // TODO: Properly handle this unwrap
    let ts_type_ref = &ts_type_ann.as_ts_type_ref().unwrap(); // TODO: Properly handle this unwrap
    let type_params = ts_type_ref.type_params.as_ref().unwrap(); // TODO: Properly handle this unwrap
    let return_ts_type = &**type_params.params.get(0).unwrap(); // TODO: Properly handle this unwrap
    let return_azle_type = AzleType::from_ts_type(return_ts_type.clone(), source_map);

    return_azle_type
        .to_act_data_type(&None)
        .to_token_stream(&ts_keywords::ts_keywords())
}

// TODO this part should be refactored to allow us to get a params data structure by just passing in a &FnDecl
// TODO that params data structures can have the name, the type, and both strings and idents as necessary
fn get_ts_method_signature_rust_params(
    ts_method_signature: &TsMethodSignature,
    source_map: &SourceMap,
) -> RustParams {
    let azle_method_signature = AzleMethodSignature {
        ts_method_signature: ts_method_signature.clone(),
        source_map,
    };
    let external_canister_method = azle_method_signature.to_act_external_canister_method();

    let params = external_canister_method
        .params
        .to_token_streams(&ts_keywords::ts_keywords());

    let param_names: Vec<Ident> = external_canister_method
        .params
        .iter()
        .map(|param| format_ident!("{}", param.prefixed_name()))
        .collect();

    let param_types: Vec<TokenStream> = external_canister_method
        .params
        .iter()
        .map(|param| param.data_type.to_token_stream(&ts_keywords::ts_keywords()))
        .collect();

    RustParams {
        params,
        param_names,
        param_types,
    }
}

pub fn generate_param_variables(rust_params: &RustParams) -> Vec<TokenStream> {
    let param_names = &rust_params.param_names;

    param_names
    .iter()
    .enumerate()
    .map(|(index, param_name)| {
        let param_name_js_value = format_ident!("{}_js_value", param_name.to_string());
        let param_type = &rust_params.param_types[index];

        quote! {
            let #param_name_js_value = args_js_object.get(#index, _context).unwrap();
            let #param_name: #param_type = #param_name_js_value.try_from_vm_value(&mut *_context).unwrap();
        }
    })
    .collect()
}

fn generate_tuple(idents: &Vec<Ident>) -> TokenStream {
    let comma = if idents.len() == 1 {
        quote! { , }
    } else {
        quote! {}
    };
    quote! { (#(#idents),*#comma) }
}
