package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableProcessVarsReq", description = "Flowable process variables request")
public class FlowableProcessVarsReq {
    @ApiModelProperty(value = "process instance id", required = true)
    private String processInstanceId;

    @ApiModelProperty("form key (optional, for variable whitelist)")
    private String formKey;
}
