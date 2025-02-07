use proc_macro2::TokenStream;
use quote::quote;

use cdk_framework::{act::node::canister_method::QueryOrUpdateMethod, traits::ToTypeAnnotation};

use crate::ts_keywords;

pub fn generate(methods: &Vec<QueryOrUpdateMethod>) -> TokenStream {
    let match_arms = generate_match_arms(methods);
    quote! {
        fn _azle_ic_reply(
            _this: &boa_engine::JsValue,
            _aargs: &[boa_engine::JsValue],
            _context: &mut boa_engine::Context
        ) -> boa_engine::JsResult<boa_engine::JsValue> {
            let method_name = METHOD_NAME_REF_CELL.with(|method_name_ref_cell| method_name_ref_cell.borrow().clone());

            match &method_name[..] {
                #(#match_arms)*
                _ => panic!("This cannot happen")
            }
        }
    }
}

fn generate_match_arms(methods: &Vec<QueryOrUpdateMethod>) -> Vec<TokenStream> {
    methods
        .iter()
        .filter(|method| method.is_manual)
        .map(|method| generate_match_arm(method))
        .collect()
}

fn generate_match_arm(method: &QueryOrUpdateMethod) -> TokenStream {
    let name = &method.name;
    let return_type = method
        .return_type
        .to_type_annotation(&ts_keywords::ts_keywords(), name.clone());

    quote!(
        #name => {
            let reply_value: #return_type = _aargs.get(0).unwrap().clone().try_from_vm_value(&mut *_context).unwrap();
            Ok(ic_cdk::api::call::reply((reply_value,)).try_into_vm_value(_context).unwrap())
        }
    )
}
