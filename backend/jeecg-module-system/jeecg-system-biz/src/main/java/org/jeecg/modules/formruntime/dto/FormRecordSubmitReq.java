package org.jeecg.modules.formruntime.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FormRecordSubmitReq", description = "Form record submit request")
public class FormRecordSubmitReq {
    @ApiModelProperty(value = "form key", required = true)
    private String formKey;

    @ApiModelProperty(value = "data json", required = true)
    private String dataJson;
}
