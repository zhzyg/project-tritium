package org.jeecg.modules.formruntime.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Map;

@Data
@ApiModel(value = "FormRecordMutationReq", description = "Form runtime mutation request")
public class FormRecordMutationReq {
    @ApiModelProperty(value = "form key", required = true)
    private String formKey;

    @ApiModelProperty("record id (required for update)")
    private String recordId;

    @ApiModelProperty(value = "data payload", required = true)
    private Map<String, Object> data;

    @ApiModelProperty("mutation options")
    private FormRecordMutationOptions options;
}
