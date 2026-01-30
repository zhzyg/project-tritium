package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableProcessDefRegReq", description = "Flowable process definition register request")
public class FlowableProcessDefRegReq {
    @ApiModelProperty(value = "process definition key", required = true)
    private String processKey;

    @ApiModelProperty("name")
    private String name;

    @ApiModelProperty("category")
    private String category;

    @ApiModelProperty("enabled")
    private Integer enabled;

    @ApiModelProperty("is default")
    private Integer isDefault;
}
