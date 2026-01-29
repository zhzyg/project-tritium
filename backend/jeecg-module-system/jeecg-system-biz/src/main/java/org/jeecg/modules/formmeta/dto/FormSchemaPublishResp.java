package org.jeecg.modules.formmeta.dto;

import lombok.Data;

import java.util.List;

@Data
public class FormSchemaPublishResp {
    private String formKey;
    private Integer version;
    private String tableName;
    private List<String> ddlApplied;
}
