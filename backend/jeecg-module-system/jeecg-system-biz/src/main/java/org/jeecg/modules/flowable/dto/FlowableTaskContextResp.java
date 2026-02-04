package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
public class FlowableTaskContextResp {
    @ApiModelProperty("task id")
    private String taskId;

    @ApiModelProperty("process instance id")
    private String processInstanceId;

    @ApiModelProperty("task name")
    private String taskName;

    @ApiModelProperty("process name")
    private String processName;

    @ApiModelProperty("business key")
    private String businessKey;

    @ApiModelProperty("record id")
    private String recordId;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("schema version")
    private Integer schemaVersion;

    @ApiModelProperty("task active")
    private Boolean active;

    @ApiModelProperty("assignee")
    private String assignee;

    @ApiModelProperty("candidate groups")
    private java.util.List<String> candidateGroups;

    @com.fasterxml.jackson.annotation.JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("create time")
    private java.util.Date createTime;
}
