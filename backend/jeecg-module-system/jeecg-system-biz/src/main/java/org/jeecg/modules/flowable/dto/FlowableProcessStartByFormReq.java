package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableProcessStartByFormReq", description = "Flowable start process by form request")
public class FlowableProcessStartByFormReq {
    @ApiModelProperty(value = "form key", required = true)
    private String formKey;

    @ApiModelProperty(value = "record id", required = true)
    private String recordId;

    @ApiModelProperty("assignee")
    private String assignee;
}
