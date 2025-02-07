use cdk_framework::act::node::candid::{record, variant, Record, Variant};

use swc_common::SourceMap;
use swc_ecma_ast::TsTypeLit;

pub use azle_type_element::AzleTypeElement;

mod azle_type_element;
mod get_dependencies;
mod get_source_text;

pub mod get_source_info;

#[derive(Clone)]
pub struct AzleTypeLit<'a> {
    pub ts_type_lit: TsTypeLit,
    pub source_map: &'a SourceMap,
}

impl AzleTypeLit<'_> {
    pub(super) fn to_record(&self) -> Record {
        let members: Vec<record::Member> = self
            .ts_type_lit
            .members
            .iter()
            .map(|member| {
                let azle_member =
                    AzleTypeElement::from_ts_type_element(member.clone(), self.source_map);
                azle_member.to_record_member()
            })
            .collect();

        Record {
            name: None,
            members,
        }
    }

    pub(super) fn to_variant(&self) -> Variant {
        let members: Vec<variant::Member> = self
            .ts_type_lit
            .members
            .iter()
            .map(|member| {
                let azle_member =
                    AzleTypeElement::from_ts_type_element(member.clone(), self.source_map);
                azle_member.to_variant_member()
            })
            .collect();

        Variant {
            name: None,
            members,
        }
    }
}
