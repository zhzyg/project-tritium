package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableProcessStartResp", description = "Flowable process start response")
public class FlowableProcessStartResp {
    @ApiModelProperty("process instance id")
    private String processInstanceId;
}
