var cusBalance = 0;
var lastSubmitdate = new Date().getTime();
//页面加载
$(document).ready(function () {
    $(".correct").html("");
    $(".correct").hide();
    // $(".llb").html("");
    regMaskClickEvent();
    var m = $("#mobile").val();

});


///选择流量点击事件
function regFlowClickEvent(obj) {
    $(obj).bind("click", function () {
        $(this).parent().children().removeClass("selected");
        $(this).addClass("selected");

        var selectedFlow = $(".llb a.selected");
        var NeedFlow = selectedFlow.data("needflow");
        $("#needmyflow").html(NeedFlow);
    });
}

///***提取流量***
function rechargeFlow(mobile, flow, dbkey) {
    ///提交按钮不可用

    var timestamp = new Date().getTime();
    if ((timestamp - lastSubmitdate) < 1100) {
        lastSubmitdate = timestamp;
        return;
    }
    $.ajax({
        url: "/BaseHandle.ashx",
        type: "get",
        data: { action: "RechargeFlow", "mobile": mobile, "dbkey": dbkey, timestamp: timestamp },
        dataType: "json",
        success: function (result) {
            ////提交按钮恢复可用
            submitIsEnable(true);
            if (!result) {
                alertMsg("提交失败", false);
                return;
            }
            if (result.Msg == "SessionIsNull") {
                redirect();
                return;
            }
            if (result.Type == 1) {
                alertMsg(result.Msg, false);
            } else {
                alert("<div class=\"icon-correct\">" + result.Msg + "</div>", "提取流量结果", "确认", function () {
                    redirect();
                });
            }
        }
    });
}


///遮罩层
function maskShow(mobile, flow, code, isShow) {
    var isConfirmShow = isShow;
    $("#maskflow").data("flow", flow);
    $("#maskflow").data("code", code);
    $("#maskmobile").data("mobile", mobile);
    $("#maskmobile").html(mobile);
    $("#maskflow").html(flow + "MB");
    if (isConfirmShow === true) {
        $("#mask").show();
    } else {
        $("#mask").hide();
        $("#maskmobile").html("");
        $("#maskflow").html("");
    }
}
///遮罩层按钮事件
function regMaskClickEvent() {

    $("#mask div.back").bind("click", function () {
        $("#mask").hide();
    });
    $("#mask div.sure").unbind("click");
    $("#mask div.sure").bind("click", function () {
        $("#mask").hide();

        submitIsEnable(false);
        $(this).unbind("click");
        var mobile = $("#maskmobile").data("mobile");
        var flow = $("#maskflow").data("flow");
        var code = $("#maskflow").data("code");

        rechargeFlow(mobile, flow, code);

        $("#mask div.sure").unbind("click");
    });
}

$("#mobile").bind("focus", function () {
    submitIsEnable(false);
});

//提交按钮可用设置
function submitIsEnable(isEnable) {
    if (!isEnable) {
        $(".btn-submit").data("enable", false);
        $(".btn-submit a").addClass("btn-gray");
    } else {
        $(".btn-submit").data("enable", true);
        $(".btn-submit a").removeClass("btn-gray");
    }
}

//弹出提示
function alertMsg(msg, isCorrect) {
    var m = "";
    var cssStyle = "icon-correct";
    if (msg == "") return;
    if (!isCorrect) {
        cssStyle = "icon-error";
    }
    m = "<div class=\"" + cssStyle + "\">" + msg + "</div>";
    alert(m);
}

///显示错误信息
function showErro(errMsg, isShow) {
    var isShowErro = isShow;
    if (errMsg) {
        $(".error").html(errMsg);
        isShowErro = (isShow == undefined ? true : isShow);
    }
    if (!isShowErro) {
        $(".error").hide();
    } else {
        $(".error").show();
    }
}

///验证数字
function isNumber(content) {
    var reg = /^\d*$/;
    return reg.test(content);
}

///跳转
function redirect() {
    window.location.href = "/bank/MyBank.html";
}