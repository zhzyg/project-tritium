package org.jeecg.modules.flowable.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FlowableHistoricTaskResp", description = "Flowable historic task response")
public class FlowableHistoricTaskResp {
    @ApiModelProperty("task id")
    private String taskId;

    @ApiModelProperty("task name")
    private String name;

    @ApiModelProperty("process instance id")
    private String processInstanceId;

    @ApiModelProperty("process name")
    private String processName;

    @ApiModelProperty("assignee")
    private String assignee;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("end time")
    private Date endTime;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("claim time")
    private Date claimTime;

    @ApiModelProperty("duration in millis")
    private Long duration;
}
