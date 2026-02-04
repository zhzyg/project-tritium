package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableProcFormBindResp", description = "Flowable process-form binding response")
public class FlowableProcFormBindResp {
    @ApiModelProperty("process definition key")
    private String processKey;

    @ApiModelProperty("form key")
    private String formKey;

    @ApiModelProperty("form name")
    private String formName;

    @ApiModelProperty("enabled")
    private Integer enabled;
}
