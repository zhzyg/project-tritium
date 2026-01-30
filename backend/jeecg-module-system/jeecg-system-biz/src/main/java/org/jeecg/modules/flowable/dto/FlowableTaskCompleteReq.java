package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableTaskCompleteReq", description = "Flowable task complete request")
public class FlowableTaskCompleteReq {
    @ApiModelProperty(value = "task id", required = true)
    private String taskId;

    @ApiModelProperty("assignee (optional validation)")
    private String assignee;
}
