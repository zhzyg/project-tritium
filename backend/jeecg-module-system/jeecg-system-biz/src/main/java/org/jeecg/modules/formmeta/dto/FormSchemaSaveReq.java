package org.jeecg.modules.formmeta.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FormSchemaSaveReq", description = "Form schema save request")
public class FormSchemaSaveReq {
    @ApiModelProperty(value = "form key", required = true)
    private String formKey;

    @ApiModelProperty(value = "schema json", required = true)
    private String schemaJson;

    @ApiModelProperty("publish schema")
    private Boolean publish;
}
