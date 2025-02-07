use cdk_framework::act::node::canister_method::{CanisterMethod, CanisterMethodType, QueryMethod};

use crate::ts_ast::azle_program::HelperMethods;

use super::TsAst;

impl TsAst {
    pub fn build_query_methods(&self) -> Vec<QueryMethod> {
        let query_canister_methods = self
            .azle_programs
            .build_canister_method_nodes(CanisterMethodType::Query);
        let query_methods =
            query_canister_methods
                .iter()
                .fold(vec![], |mut acc, canister_method| {
                    if let CanisterMethod::Query(query_method) = canister_method {
                        acc.push(query_method.clone());
                    }
                    acc
                });
        query_methods
    }
}
