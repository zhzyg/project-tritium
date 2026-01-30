package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.List;

@Data
@ApiModel(value = "FlowableProcessStatusResp", description = "Flowable process status response")
public class FlowableProcessStatusResp {
    @ApiModelProperty("process ended")
    private boolean ended;

    @ApiModelProperty("business key")
    private String businessKey;

    @ApiModelProperty("current tasks")
    private List<FlowableTaskResp> currentTasks;
}
