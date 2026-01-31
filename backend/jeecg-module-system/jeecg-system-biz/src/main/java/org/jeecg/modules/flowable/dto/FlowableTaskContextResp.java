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

    @ApiModelProperty("record id")
    private String recordId;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("schema version")
    private Integer schemaVersion;
}
