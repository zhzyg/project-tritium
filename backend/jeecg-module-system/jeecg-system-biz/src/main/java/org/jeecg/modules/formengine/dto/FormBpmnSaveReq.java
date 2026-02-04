package org.jeecg.modules.formengine.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FormBpmnSaveReq", description = "Form BPMN save request")
public class FormBpmnSaveReq {
    @ApiModelProperty(value = "form key", required = true)
    private String formKey;

    @ApiModelProperty(value = "bpmn xml", required = true)
    private String bpmnXml;
}
