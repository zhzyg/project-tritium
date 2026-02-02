package org.jeecg.modules.flowable.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.Date;

@Data
@ApiModel(value = "FlowableHistoricProcessInstanceResp", description = "Flowable historic process instance response")
public class FlowableHistoricProcessInstanceResp {
    @ApiModelProperty("process instance id")
    private String processInstanceId;

    @ApiModelProperty("process definition id")
    private String processDefinitionId;

    @ApiModelProperty("process name")
    private String processName;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("start time")
    private Date startTime;

    @JsonFormat(timezone = "GMT+8", pattern = "yyyy-MM-dd HH:mm:ss")
    @ApiModelProperty("end time")
    private Date endTime;

    @ApiModelProperty("status")
    private String status;

    @ApiModelProperty("start user id")
    private String startUserId;

    @ApiModelProperty("business key")
    private String businessKey;
}
