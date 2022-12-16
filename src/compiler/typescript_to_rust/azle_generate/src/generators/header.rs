pub fn generate_header_code(main_js: &str, stable_storage_js: &str) -> proc_macro2::TokenStream {
    quote::quote! {
        // This code is automatically generated by Azle

        #![allow(warnings, unused)]

        use std::str::FromStr;
        use azle_vm_value_derive::{
            CdkActTryIntoVmValue,
            CdkActTryFromVmValue
        };
        use ic_cdk::api::call::CallResult;
        use std::borrow::BorrowMut;
        use rand::{
            Rng,
            SeedableRng,
            rngs::StdRng
        };

        thread_local! {
            static BOA_CONTEXT_REF_CELL: std::cell::RefCell<boa_engine::Context> = std::cell::RefCell::new(boa_engine::Context::default());
            static PROMISE_MAP_REF_CELL: std::cell::RefCell<std::collections::HashMap<String, boa_engine::JsValue>> = std::cell::RefCell::new(std::collections::HashMap::new());
            static UUID_REF_CELL: std::cell::RefCell<String> = std::cell::RefCell::new("".to_string());
            static METHOD_NAME_REF_CELL: std::cell::RefCell<String> = std::cell::RefCell::new("".to_string());
            static RNG_REF_CELL: std::cell::RefCell<StdRng> = std::cell::RefCell::new(SeedableRng::from_seed([0u8; 32]));
        }

        static MAIN_JS: &'static str = #main_js;
        static STABLE_STORAGE_JS: &'static str = #stable_storage_js;
    }
}
