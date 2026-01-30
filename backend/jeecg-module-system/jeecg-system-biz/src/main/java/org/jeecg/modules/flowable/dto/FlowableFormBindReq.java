package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableFormBindReq", description = "Flowable form-process bind request")
public class FlowableFormBindReq {
    @ApiModelProperty(value = "form key", required = true)
    private String formKey;

    @ApiModelProperty(value = "process definition key", required = true)
    private String processKey;
}
