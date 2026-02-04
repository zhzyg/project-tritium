package org.jeecg.modules.formengine.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FormBpmnPublishReq", description = "Form BPMN publish request")
public class FormBpmnPublishReq {
    @ApiModelProperty(value = "form key", required = true)
    private String formKey;
}
