package org.jeecg.modules.flowable.service;

import org.jeecg.modules.formmeta.dto.FormSchemaPublishedResp;

import java.util.Map;
import java.util.Set;

public interface IFlowableVarMappingService {
    Map<String, Object> mapVariables(String formKey,
                                     FormSchemaPublishedResp published,
                                     Map<String, Object> data,
                                     Set<String> restrictFields);
}
