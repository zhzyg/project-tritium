package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableProcessStartReq", description = "Flowable process start request")
public class FlowableProcessStartReq {
    @ApiModelProperty(value = "process definition key", required = true)
    private String processKey;

    @ApiModelProperty("business key")
    private String businessKey;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("record id")
    private String recordId;

    @ApiModelProperty("assignee (default admin)")
    private String assignee;
}
