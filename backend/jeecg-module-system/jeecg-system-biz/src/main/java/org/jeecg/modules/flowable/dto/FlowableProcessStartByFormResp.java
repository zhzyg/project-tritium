package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableProcessStartByFormResp", description = "Flowable start process by form response")
public class FlowableProcessStartByFormResp {
    @ApiModelProperty("process instance id")
    private String processInstanceId;

    @ApiModelProperty("used process key")
    private String processKey;

    @ApiModelProperty("business key")
    private String businessKey;
}
