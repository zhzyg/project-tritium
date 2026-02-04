package org.jeecg.modules.formengine.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FormBpmnPublishResp", description = "Form BPMN publish response")
public class FormBpmnPublishResp {
    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("process definition key")
    private String procDefKey;

    @ApiModelProperty("process definition id")
    private String procDefId;

    @ApiModelProperty("deployment id")
    private String deploymentId;

    @ApiModelProperty("version")
    private Integer version;

    @ApiModelProperty("published time")
    private java.util.Date publishedTime;
}
