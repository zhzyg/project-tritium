package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableTaskClaimReq", description = "Flowable task claim request")
public class FlowableTaskClaimReq {
    @ApiModelProperty(value = "task id", required = true)
    private String taskId;

    @ApiModelProperty(value = "user id", required = true)
    private String userId;
}
