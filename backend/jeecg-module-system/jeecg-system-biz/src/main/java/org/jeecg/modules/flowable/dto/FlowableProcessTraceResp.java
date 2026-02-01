package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;
import java.util.Map;

@Data
@ApiModel(value = "FlowableProcessTraceResp", description = "Flowable process trace item")
public class FlowableProcessTraceResp {
    @ApiModelProperty("event time")
    private Date time;

    @ApiModelProperty("event type: START, TASK, END")
    private String type;

    @ApiModelProperty("task id (if task)")
    private String taskId;

    @ApiModelProperty("task name (if task) or activity name")
    private String taskName;

    @ApiModelProperty("assignee")
    private String assignee;

    @ApiModelProperty("comment")
    private String comment;
    
    @ApiModelProperty("variables delta")
    private Map<String, Object> variablesDelta;
}
