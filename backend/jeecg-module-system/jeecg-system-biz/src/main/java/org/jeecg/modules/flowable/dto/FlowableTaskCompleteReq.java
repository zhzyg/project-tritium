package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Map;

@Data
@ApiModel(value = "FlowableTaskCompleteReq", description = "Flowable task complete request")
public class FlowableTaskCompleteReq {
    @ApiModelProperty(value = "task id", required = true)
    private String taskId;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("record id")
    private String recordId;

    @ApiModelProperty("patch data")
    private Map<String, Object> patchData;

    @ApiModelProperty("assignee (optional validation)")
    private String assignee;

    @ApiModelProperty("process variables")
    private Map<String, Object> variables;
}
