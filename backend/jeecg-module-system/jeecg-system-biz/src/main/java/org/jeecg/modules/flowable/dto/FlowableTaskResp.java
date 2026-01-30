package org.jeecg.modules.flowable.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FlowableTaskResp", description = "Flowable task response")
public class FlowableTaskResp {
    @ApiModelProperty("task id")
    private String taskId;

    @ApiModelProperty("task name")
    private String name;

    @ApiModelProperty("process instance id")
    private String processInstanceId;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("create time")
    private Date createTime;
}
