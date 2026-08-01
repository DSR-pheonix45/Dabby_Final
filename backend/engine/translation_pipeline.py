from typing import List, Dict, Any, Optional
from adapters.adapter_factory import adapter_factory
from engine.hierarchy_flagger import hierarchy_flagger
from engine.normalizer import normalizer
from engine.semantic_extractor import semantic_extractor
from engine.knowledge_dictionary import knowledge_dictionary
from engine.industry_ontology import industry_ontology
from engine.rule_engine import rule_engine
from engine.confidence_scorer import confidence_scorer
from engine.validator import validator
from engine.sequence_generator import SequenceGenerator
from engine.llm_resolver import llm_resolver
from engine.learning_engine import learning_engine
from schemas.coa_translation import ProcessedLedgerItem, StructuralFlags

class TranslationPipeline:
    """
    Master Universal COA Translation Pipeline Orchestrator.
    Connects Adapters -> Stage 1 Hierarchy Flagger -> Stage 2 Normalizer ->
    Semantic Vector Extractor -> Learning Memory -> Deterministic Rules ->
    Confidence Scorer -> LLM Resolver -> Validator -> Sequence Generator.
    """

    async def translate_file(
        self,
        file_content: bytes,
        filename: str,
        workbench_id: str,
        explicit_erp: Optional[str] = None,
        industry: Optional[str] = None
    ) -> List[ProcessedLedgerItem]:

        # Step 1: Select ERP Adapter & Extract Universal COA Objects
        adapter = adapter_factory.get_adapter(file_content, filename, explicit_erp)
        raw_objects = adapter.parse(file_content, filename)

        if not raw_objects:
            return []

        # Step 2: STAGE 1 - Structural Hierarchy & Flagging Engine
        flagged_items = hierarchy_flagger.process(raw_objects)

        # Initialize sequence generator for this batch session
        seq_gen = SequenceGenerator()
        results: List[ProcessedLedgerItem] = []

        # Step 3: Process each ledger item through downstream pipeline
        for raw_item, flags in flagged_items:
            # Filter aggregate total summary lines if needed
            if flags.is_summary_total:
                continue

            # STAGE 2 - Canonical Normalization Engine
            norm_name = normalizer.normalize_text(raw_item.account_name)
            if not norm_name:
                continue

            # Semantic Vector Extraction
            features = semantic_extractor.extract_features(raw_item, flags, norm_name)

            # Check Tenant-Isolated Learning Memory first (100% confidence if user previously corrected)
            stored_override = await learning_engine.get_stored_override(workbench_id, raw_item.account_name)

            mapped_class = "Expenses"
            mapped_group = "XAD"
            confidence = 0.50
            mapping_source = "fallback"
            reasoning = None

            if stored_override:
                mapped_class, mapped_group = stored_override
                confidence = 1.00
                mapping_source = "user_override"
                reasoning = "Matched tenant user override memory"
            else:
                # Industry Ontology Overlay Check
                ind_match = industry_ontology.get_overlay_mapping(industry or "", norm_name)
                if ind_match:
                    mapped_class, mapped_group = ind_match
                    confidence = 0.96
                    mapping_source = "industry_ontology"
                    reasoning = f"Matched {industry} industry ontology rules"
                else:
                    # Knowledge Dictionary Lookup
                    dict_match = knowledge_dictionary.lookup(norm_name)
                    if dict_match:
                        mapped_class, mapped_group = dict_match
                        confidence = 0.95
                        mapping_source = "knowledge_dictionary"
                        reasoning = "Matched financial ontology terms"
                    
                    # Deterministic Rule Engine
                    rule_match = rule_engine.evaluate(raw_item, flags, norm_name, features, industry)
                    if rule_match:
                        r_cls, r_grp, r_conf, r_rule = rule_match
                        if r_conf >= confidence:
                            mapped_class = r_cls
                            mapped_group = r_grp
                            confidence = r_conf
                            mapping_source = "rule_engine"
                            reasoning = f"Triggered rule {r_rule}"

            # If confidence is low (< 80%), invoke Constrained LLM Resolver
            if confidence < 0.80:
                l_cls, l_grp, l_conf, l_reason = await llm_resolver.resolve(
                    account_name=norm_name,
                    account_type=raw_item.account_type,
                    parent_account=flags.parent_chain or raw_item.parent_account,
                    industry=industry
                )
                mapped_class = l_cls
                mapped_group = l_grp
                confidence = l_conf
                mapping_source = "llm_resolver"
                reasoning = l_reason

            # Validation Engine: Detect impossible mappings
            val_status, val_notes, final_cls, final_grp = validator.validate_mapping(norm_name, mapped_class, mapped_group)

            # Generate atomic sequential ALERX full code (e.g. A-ACO-001)
            full_code = seq_gen.generate_code(final_cls, final_grp)

            results.append(ProcessedLedgerItem(
                external_id=raw_item.external_id,
                original_name=raw_item.account_name,
                original_type=raw_item.account_type,
                parent_name=raw_item.parent_account,
                normalized_name=norm_name,
                flags=flags,
                semantic_tags=features,
                mapped_class=final_cls,
                mapped_group_code=final_grp,
                generated_full_code=full_code,
                confidence_score=confidence,
                mapping_source=mapping_source,
                ai_reasoning=reasoning,
                validation_status=val_status,
                validation_notes=val_notes
            ))

        return results

translation_pipeline = TranslationPipeline()
