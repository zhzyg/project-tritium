package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.List;

@Data
@ApiModel(value = "FlowableTaskFieldPermResp", description = "Task field permission response")
public class FlowableTaskFieldPermResp {
    @ApiModelProperty("process definition key")
    private String procDefKey;

    @ApiModelProperty("task definition key")
    private String taskDefKey;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("editable fields")
    private List<String> editableFields;

    @ApiModelProperty("enabled")
    private Integer enabled;
}
