use swc_ecma_ast::{TsFnParam, TsFnType, TsType, TsTypeAnn};

use crate::ts_ast::{traits::GetTsType, FunctionAndMethodTypeHelperMethods};

impl FunctionAndMethodTypeHelperMethods for TsFnType {
    fn get_ts_fn_params(&self) -> Vec<TsFnParam> {
        self.params.clone()
    }

    fn get_ts_type_ann(&self) -> TsTypeAnn {
        self.type_ann.clone()
    }

    fn get_valid_return_types(&self) -> Vec<&str> {
        vec!["Oneway", "Update", "Query"]
    }

    fn get_return_type(&self) -> Option<TsType> {
        Some(self.get_ts_type_ann().get_ts_type())
    }
}
