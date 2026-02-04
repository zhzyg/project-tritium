package org.jeecg.modules.formengine.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FormBpmnSaveResp", description = "Form BPMN save response")
public class FormBpmnSaveResp {
    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("status")
    private String status;

    @ApiModelProperty("bpmn hash")
    private String bpmnHash;

    @ApiModelProperty("updated time")
    private java.util.Date updatedTime;
}
