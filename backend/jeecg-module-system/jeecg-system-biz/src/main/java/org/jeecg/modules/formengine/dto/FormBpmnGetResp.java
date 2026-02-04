package org.jeecg.modules.formengine.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FormBpmnGetResp", description = "Form BPMN get response")
public class FormBpmnGetResp {
    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("bpmn xml")
    private String bpmnXml;

    @ApiModelProperty("bpmn hash")
    private String bpmnHash;

    @ApiModelProperty("status")
    private String status;

    @ApiModelProperty("process definition key")
    private String procDefKey;

    @ApiModelProperty("process definition id")
    private String procDefId;

    @ApiModelProperty("deployment id")
    private String deploymentId;

    @ApiModelProperty("published time")
    private java.util.Date publishedTime;

    @ApiModelProperty("updated time")
    private java.util.Date updatedTime;
}
