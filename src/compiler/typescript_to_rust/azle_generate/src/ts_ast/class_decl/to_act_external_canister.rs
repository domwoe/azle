use cdk_framework::act::node::{external_canister::Method, ExternalCanister};
use swc_ecma_ast::{ClassDecl, ClassMember};

use crate::ts_ast::{source_map::SourceMapped, GetName};

impl SourceMapped<'_, ClassDecl> {
    pub fn to_act_external_canister(&self) -> ExternalCanister {
        let name = self.ident.get_name().to_string();
        let methods = self.build_external_canister_methods();

        ExternalCanister { name, methods }
    }

    fn build_external_canister_methods(&self) -> Vec<Method> {
        self.class
            .body
            .iter()
            .fold(vec![], |mut acc, class_member| match class_member {
                ClassMember::ClassProp(class_prop) => {
                    let class_prop_with_source_map = SourceMapped::new(class_prop, self.source_map);

                    let canister_method_result =
                        class_prop_with_source_map.to_act_external_canister_method();

                    match canister_method_result {
                        Ok(canister_method) => {
                            acc.push(canister_method);
                            acc
                        }
                        Err(e) => panic!(
                            "{}",
                            self.build_invalid_class_prop_error_message(class_prop, e)
                        ),
                    }
                }
                _ => panic!(
                    "{}",
                    self.build_invalid_class_member_error_message(class_member)
                ),
            })
    }
}
