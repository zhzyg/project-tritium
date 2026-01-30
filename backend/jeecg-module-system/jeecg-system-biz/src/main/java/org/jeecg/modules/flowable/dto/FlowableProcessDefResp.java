package org.jeecg.modules.flowable.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel(value = "FlowableProcessDefResp", description = "Flowable process definition response")
public class FlowableProcessDefResp {
    @ApiModelProperty("process definition key")
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
