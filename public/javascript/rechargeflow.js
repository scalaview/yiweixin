var cusBalance = 0;
var lastSubmitdate = new Date().getTime();
//页面加载
$(document).ready(function () {
    $(".correct").html("");
    $(".correct").hide();
    // $(".llb").html("");
    getCustomerBalance();
    regMaskClickEvent();
    var m = $("#mobile").val();

});

//获取手机归属地和流量
function getFlowByMobile(mobile) {
    if (!mobile || $.trim(mobile) == "") {
        $(".llb").html("");
        showErro("请输入手机号码");
        return;
    } else {
        showErro("");
    }

    getMobilePlace(mobile);

    var facevalueTmpl = '<a class = "#{Enable}"  data-value="#{FaceValue}" data-needFlow="#{NeedFlow}" data-dbkey="#{DbKey}">#{FaceName}<div class="an"></div></a>';
    var timestamp = new Date().getTime();
    $.ajax({
        url: "/BaseHandle.ashx",
        type: "get",
        data: { action: "GetFlowByMobile", "mobile": mobile, timestamp: timestamp },
        dataType: "json",
        success: function (result) {
            if ($.trim(result) == "" || !result) {
                $(".correct").hide();
                $(".correct").html("");
                $(".llb").html("");
                showErro("亲，没有可选择的流量包");
                return;
            }

            var tmplObj = new XQT.Tmpl();
            if (result && result.Data) {
                var fvs = result.Data;
                var html = $(".llb").html();

                var faceList = XQT.Tmpl.renderTo(facevalueTmpl, fvs, {
                    "Productcode": function (k, d) {
                        return productKey;
                    },
                    "Enable": function (k, d) {
                        return cusBalance < d["NeedFlow"] ? "mask01" : "";
                    }
                }, ".llb");
                regFlowClickEvent(".llb a");
                submitIsEnable(true);
            }
        }
    });
}


//获取手机归属地
function getMobilePlace(moblie) {
    var timestamp = new Date().getTime();
    $.ajax({
        url: "/BaseHandle.ashx",
        type: "get",
        data: { action: "GetMobilePlace", "mobile": moblie, timestamp: timestamp },
        dataType: "html",
        success: function (result) {
            if ($.trim(result) == "" || !result) {
                $(".correct").hide();
                $(".correct").html("");
                return;
            }
            $(".correct").html(result);
            $(".correct").show();
        }
    });
}

///获取当前用户流量
function getCustomerBalance() {
    var timestamp = new Date().getTime();
    $.ajax({
        url: "/BaseHandle.ashx",
        type: "get",
        data: { action: "GetCustomer", timestamp: timestamp },
        dataType: "json",
        success: function (result) {
            if (result.Msg == "SessionIsNull") {
                redirect();
                return;
            }
            if (!result) {
                $("#balance").html("选择流量包（您当前可提取流量<span style=\"color:orange;\">0流量币</span>）");
                return;
            } else {
                var bank = JSON.parse(result.Data);
                var b = (parseInt(bank.Balance) >= 0 ? parseInt(bank.Balance) : 0);
                cusBalance = b;
                $("#hidBalance").val(b);
                $("#balance").html("选择流量包（您当前可提取流量<span style=\"color:orange;\">" + b + "</span>流量币）");
                $("#mobile").val(bank.Mobile);

                getFlowByMobile(bank.Mobile);
            }
        }
    });
}


///提取流量事件
$(".btn-submit").bind("click", function () {

    ///转赠流量
    var selectedFlow = $(".llb a.selected");
    //if (selectedFlow.attr('class', 'mask01')) {
    //    alertMsg("您的余额不足，无法完成此项操作", false);
    //    return;
    //}
    var flow = selectedFlow.data("value");
    if (!flow || flow == "") {
        alertMsg("请选择流量包", false);
        return;
    }
    var dbkey = selectedFlow.data("dbkey");
    var mobile = $("#mobile").val();
    maskShow(mobile, flow, dbkey, true);
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