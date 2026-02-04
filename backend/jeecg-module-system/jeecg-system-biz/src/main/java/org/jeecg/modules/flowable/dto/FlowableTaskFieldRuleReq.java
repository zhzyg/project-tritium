package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.List;

@Data
@ApiModel(value = "FlowableTaskFieldRuleReq", description = "Task field rule upsert request")
public class FlowableTaskFieldRuleReq {
    @ApiModelProperty("process definition key")
    private String procDefKey;

    @ApiModelProperty("task definition key")
    private String taskDefKey;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("visible fields")
    private List<String> visibleFields;

    @ApiModelProperty("editable fields")
    private List<String> editableFields;

    @ApiModelProperty("required fields")
    private List<String> requiredFields;
}
