package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableTaskQueryReq", description = "Flowable task query request")
public class FlowableTaskQueryReq {
    @ApiModelProperty("assignee (default admin)")
    private String assignee;
}
