package org.jeecg.modules.formmeta.dto;

import lombok.Data;

@Data
public class FormSchemaFieldMetaResp {
    private String fieldKey;
    private String label;
    private String widgetType;
    private String dbColumn;
    private String dbType;
    private Integer dbLength;
    private Integer nullable;
    private Integer searchable;
}
