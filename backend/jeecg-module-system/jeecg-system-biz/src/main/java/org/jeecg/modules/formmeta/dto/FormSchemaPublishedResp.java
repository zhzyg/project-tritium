package org.jeecg.modules.formmeta.dto;

import lombok.Data;

import java.util.List;

@Data
public class FormSchemaPublishedResp {
    private String formKey;
    private Integer version;
    private String tableName;
    private List<FormSchemaFieldMetaResp> fieldMetas;
}
