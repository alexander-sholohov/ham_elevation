//
// This libray can show elevation chart on canvas element.
//
// Developed by Alexander Sholohov <ra9yer@yahoo.com>
// github repository: https://github.com/alexander-sholohov/ham_elevation
// MIT license: http://choosealicense.com/licenses/mit/
//
//


function HamElevationChart(canvas) {
'use strict';

//---
var _canvas = canvas;
var _hitRegions = [];
var _chartElevations = [];
var _staticMarkerIndex = null;
var _dynamicMarkerIndex = null;

//---
var _angDiv2;
var _earthArcShift;

var _numPoints;
var _stepX;
var _stepAngl;

var _naklonX1;
var _naklonX2;

var _useEarthArc;
var _earthRadius;
var _downShift;
var _scaleH;
var _centerX;
var _centerY;
var _halfway;
var _distance;
var _ang;

var _ipX;
var _ipY;
var _iW;
var _iH;
var _anglDiv2;

var _p1;
var _p2;
var _h;

//----------------------------------------------------------------
function angleBetweenPoints(p1, p2)
{
    // grad->rad
    var lat1 = p1.lat * Math.PI / 180;
    var lat2 = p2.lat * Math.PI / 180;
    var long1 = p1.lng * Math.PI / 180;
    var long2 = p2.lng * Math.PI / 180;
 
    // 
    var cl1 = Math.cos(lat1);
    var cl2 = Math.cos(lat2);
    var sl1 = Math.sin(lat1);
    var sl2 = Math.sin(lat2);
    var delta = long2 - long1;
    var cdelta = Math.cos(delta);
    var sdelta = Math.sin(delta);
 
    // 
    var y = Math.sqrt(Math.pow(cl2 * sdelta, 2) + Math.pow(cl1 * sl2 - sl1 * cl2 * cdelta, 2));
    var x = sl1 * sl2 + cl1 * cl2 * cdelta;
 
    //
    var ad = Math.atan2(y, x);    
    return ad;
}



//----------------------------------------------------------------
function calcElevationStatistic(chartData, ang, earthRadius)
{
    var angDiv2 = ang / 2.0;
    var earthArcShift = earthRadius * Math.cos(angDiv2);
    var numPoints = chartData.length;
    var stepAngl = ang / numPoints;

    var summ = 0.0;

    var minSimple = 0.0;
    var maxSimple = 0.0;

    var minEarth = 0.0;
    var maxEarth = 0.0;

    for(var i=0; i<numPoints; i++)
    {
        var a1 = (i - numPoints/2 ) * stepAngl;
        var earthArc1 = earthRadius * Math.cos(a1);
        var earthArc2 = earthArc1 - earthArcShift;

        var elSimple = chartData[i].elevation; 
        var elEarth = chartData[i].elevation + earthArc2; 

        summ += elSimple;

        if( i==0 ) 
        {
            minSimple = elSimple;
            maxSimple = elSimple;

            minEarth = elEarth;
            maxEarth = elEarth;
        }
        else
        {
            if( elSimple > maxSimple) { maxSimple = elSimple;}
            if( elSimple < minSimple) { minSimple = elSimple;}

            if( elEarth > maxEarth) { maxEarth = elEarth;}
            if( elEarth < minEarth) { minEarth = elEarth;}
        }

    }

    var avg = (chartData.length > 0)? summ / chartData.length : 0;

    var res = {};
    res.minSimple = minSimple;
    res.maxSimple = maxSimple;
    res.minEarth = minEarth;
    res.maxEarth = maxEarth;
    res.avg = avg;

    return res;
}


//----------------------------------------------------------------
function drawEndpoint2(ctx, p1, x, y, ang)
{
    var h1 = (p1.elevation - _downShift) * _scaleH;
    var h2 = (p1.elevation + p1.antennaElevation - _downShift) * _scaleH;


    ctx.save();
    ctx.translate(x + 0.5, y);
    ctx.rotate(ang);
    ctx.scale(1, -1);

    ctx.beginPath();
    ctx.strokeStyle = "rgb(0,0,0)";
    ctx.lineWidth = 1;
    ctx.moveTo(0, 0);
    ctx.lineTo(0, h1);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "rgb(0,0,200)";
    ctx.lineWidth = 1;

    ctx.moveTo( -4, h1);
    ctx.lineTo(0, h2);
    ctx.lineTo( +4, h1);
    ctx.closePath();

    ctx.stroke();


    ctx.restore();
}


//----------------------------------------------------------------
function drawLinkBetweenAntennas(ctx, p1, p2, centerX, centerY, halfway, ang)
{
    var el1 = (p1.elevation + p1.antennaElevation - _downShift) * _scaleH;
    var el2 = (p2.elevation + p2.antennaElevation - _downShift) * _scaleH;   

    var x1 = centerX - halfway - el1 * Math.sin(ang);
    var y1 = centerY - el1 * Math.cos(ang);

    var x2 = centerX + halfway + el2 * Math.sin(ang);
    var y2 = centerY - el2 * Math.cos(ang);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgb(0,0,0)';

    ctx.stroke();
    ctx.restore();
}

//----------------------------------------------------------------
function drawEarthArc(ctx, centerX, centerY, halfway, height)
{
    ctx.beginPath();
    var shiftX = halfway * 0.2;
    var shiftY = 0;

    // this two cubic bezier curves very close to arc
    // TODO: improve for long rang
    
    var kA = 0.4;
    var kB = 0.5;
    var kC = 0.8;
    
    var cpA1x = centerX - halfway * kC;
    var cpA1y = centerY - height * kA;
    var cpB1x = centerX - halfway * kB;
    var cpB1y = centerY - height * 1;

    var cpA2x = centerX + halfway * kC;
    var cpA2y = centerY - height * kA;
    var cpB2x = centerX + halfway * kB;
    var cpB2y = centerY - height * 1;

    ctx.moveTo(centerX-halfway, centerY);
    ctx.bezierCurveTo(cpA1x, cpA1y,      cpB1x, cpB1y,    centerX, centerY-height);
    ctx.bezierCurveTo(cpB2x, cpB2y,      cpA2x, cpA2y,    centerX+halfway, centerY);

    ctx.lineWidth = 2;

    // line color
    ctx.strokeStyle = '#0000DD';
    ctx.stroke();    

}



//----------------------------------------------------------------
function prepareCommonData(p1, p2, chartData, centerX, centerY, ang)
{
    _angDiv2 = ang / 2.0;
    _earthArcShift = _earthRadius * Math.cos(_angDiv2);

    _numPoints = chartData.length;
    _stepX =  _halfway * 2 / _numPoints;
    _stepAngl = ang / _numPoints;

    _naklonX1 = p1.elevation * 1 * _scaleH;
    _naklonX2 = p2.elevation * 1 * _scaleH;
}

//----------------------------------------------------------------
function getPointByIndex(idx)
{
    var a1 = (idx - _numPoints/2 ) * _stepAngl;
    var deltaH = 0;
    if( _useEarthArc )
    {
        var earthArc1 = _earthRadius * Math.cos(a1);
        deltaH = (earthArc1 - _earthArcShift) ;
    }

    var correctionX = 0;
    if( idx < _numPoints / 2 )
    {
        correctionX = _naklonX1 * Math.sin(a1);
    }
    else
    {
        correctionX = _naklonX2 * Math.sin(a1);
    }

    var elevation1 = _chartElevations[idx] - _downShift;
    var elevation2 = (elevation1 + deltaH ) * _scaleH;

    var x = (_centerX - _halfway) + _stepX * idx + correctionX;
    var y = _centerY - elevation2;

    return {x:Math.floor(x), y:Math.floor(y)};
}


//----------------------------------------------------------------
function drawElevationShape(ctx, p1, p2, centerX, centerY, halfway, ang, earthRadius, useEarthArc, drawEarhArc)
{

    var prevX = 0;
    var prevY = 0;


    ctx.save();

    // draw earth surface (not used)
    if( drawEarhArc )
    {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#660000';
        for(var i=0; i<numPoints; i++)
        {
            var a1 = (i - numPoints/2 ) * stepAngl;
            var earthArc1 = earthRadius * Math.cos(a1);
            var earthArc2 = (earthArc1 - earthArcShift) * _scaleH;

            var x = (centerX - halfway) + stepX * i;
            var y = centerY - earthArc2;
            if( i== 0 )
            {
                ctx.moveTo(x, y);
            }
            else
            {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();    
    }


    // draw filled area
    ctx.beginPath();
    ctx.fillStyle = "rgba(20,20,0, 0.2)";
    ctx.moveTo(centerX - halfway, centerY);

    for(var i=0; i<_numPoints; i++)
    {
        var p = getPointByIndex(i);
        var x = p.x;
        var y = p.y;

        ctx.lineTo(x, y);

    }
    ctx.lineTo(centerX + halfway, centerY);
    ctx.closePath();
    ctx.fill();


    // draw elevation chart
    ctx.beginPath();
    var prevX = 0;
    var prevY = 0;
    for(var i=0; i<_numPoints; i++)
    {
        var p = getPointByIndex(i);
        var x = p.x;
        var y = p.y;
        if( i== 0 )
        {
            ctx.moveTo(x, y);
            prevX = x;
            prevY = y;
        }
        else
        {
            ctx.lineTo(x, y);
            prevX = x;
            prevY = y;
        }
    }
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#330000';
    ctx.stroke();    

    // add hitRegion
    for(var i=0; i<_numPoints; i++)
    {
        var p = getPointByIndex(i);
        var item = {x1:p.x-1, y1:p.y-50, x2:p.x+1, y2:p.y+50, obj:{idx:i, elevation:_chartElevations[i]} };

        _hitRegions.push(item);
    }


    ctx.restore();

}


//----------------------------------------------------------------
function findAppropriateChartMeshParam(screenSize, realSize, numLines)
{
    var res = {};

    var scaleFactor = screenSize / realSize;

    var x1 = realSize / numLines;
    var x2 = x1;
    var d = 1;
    var cnt = 0;

    while( x2 > 10)
    {
        x2 = x2 / 10;
        d *= 10;
        cnt += 1;
    }

    if( cnt > 0)
    {
        var x3 = Math.floor(x2);
        res.realStepSize = x3 * d;
        res.screenStepSize = res.realStepSize * scaleFactor;
        res.numLines = Math.ceil(screenSize / res.screenStepSize);  //  ceil?
        if( res.numLines > numLines * 1.5)
        {
            res.realStepSize *= 1.5;
            res.screenStepSize = res.realStepSize * scaleFactor;
            res.numLines = Math.ceil(screenSize / res.screenStepSize);
        }
        res.digitsAfterPoint = 0;
    }
    else
    {
        res.screenStepSize = screenSize / numLines;
        res.realStepSize = realSize / numLines;
        res.numLines = numLines;
        res.digitsAfterPoint = 1;
    }

    return res;
}

//----------------------------------------------------------------
function drawMesh(ctx, ipX, ipY, iW, iH, distance, cntrW, antennaPosFromCenter)
{
    var resH = findAppropriateChartMeshParam(iH, iH / _scaleH, 10);
    var screenStepH = resH.screenStepSize;
    var realStepH = resH.realStepSize;
    var numLinesH2 = resH.numLines;

    // horisontal mesh
    ctx.beginPath();
    ctx.textAlign = "end";
    ctx.textBaseline = "bottom";    
    ctx.font = "12px serif";
    ctx.fillStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#CCCCCC';

    for( var i=0; i<numLinesH2; i++)
    {
        var y = Math.floor(ipY - i*screenStepH) + 0.5;
        ctx.moveTo(ipX-3, y);
        ctx.lineTo(ipX+iW, y);
        if(true)
        {
            var v = i * realStepH + _downShift;
            ctx.fillText(v.toFixed(resH.digitsAfterPoint), ipX-3, y + 5);
        }

    }
    ctx.stroke();    

    // vertical  mesh
    var resV = findAppropriateChartMeshParam(antennaPosFromCenter*2, distance, 10);
    var screenStepV = resV.screenStepSize;
    var realStepV = resV.realStepSize;
    var numLinesV2 = resV.numLines;

    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";    
    ctx.font = "12px serif";
    ctx.fillStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#CCCCCC';

    var leftOrigin = cntrW - antennaPosFromCenter;

    for( var i=0; i<numLinesV2; i++)
    {
        var x = Math.floor(leftOrigin + i*screenStepV) + 0.5;
        ctx.moveTo(x, ipY + 2);
        ctx.lineTo(x, ipY - iH);
        var v = i * realStepV / 1000;
        var precision = (distance < 3000)? 2 : (distance < 12000)? 1 : 0;
        var t = v.toFixed( precision ) + " km";
        ctx.fillText(t, x, ipY + 15);

    }
    ctx.stroke();    


}

//----------------------------------------------------------------
function drawStaticMarkerIfNeed(ctx)
{
    var index = _staticMarkerIndex;
    if( index==null || index < 0 || index > _numPoints)
        return;

    var p1 = getPointByIndex(index);

    ctx.save();
    ctx.translate(p1.x, p1.y);
    ctx.fillStyle = "rgba(0,0,240, 0.8)";
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(-10, -15);
    ctx.lineTo(10, -15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}


//----------------------------------------------------------------
function drawDynamicMarkerIfNeed(ctx)
{
    var index = _dynamicMarkerIndex;
    if( index==null || index < 0 || index > _numPoints)
        return;

    var p1 = getPointByIndex(index);


    function intDrawMarker()
    {
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(-7, -15);
        ctx.lineTo(7, -15);
        ctx.closePath();
        ctx.fill();
    }


    ctx.save();

    ctx.translate(p1.x, p1.y);
    ctx.fillStyle = "rgba(0,0,200, 0.5)";
    intDrawMarker();
    ctx.scale(1, -1);
    intDrawMarker();

    ctx.restore();
}


//----------------------------------------------------------------
this.drawChart = function(p1, p2, chartData, useEarthArc, useFullElevation)
{
    _hitRegions = []; // initialize hit region array

    if( !_canvas.getContext )
    {
        return;
    }

    var context = _canvas.getContext('2d');

    var clientW = context.canvas.clientWidth;
    var clientH = context.canvas.clientHeight;

    var EARTH_RADIUS = 6372795;
    var ang = angleBetweenPoints(p1, p2);
    var horda = 2 * EARTH_RADIUS * Math.sin(ang / 2.0);
    var distance = ang * EARTH_RADIUS;
    var h = EARTH_RADIUS * (1 - Math.cos(ang/2.0) );
    var virtualAng = (ang < 0.05)? 0.0 : ang;  // ignore small angle


    var marginLeft = 60;
    var marginTop = 15;
    var marginRight = 15;
    var marginBottom = 20;

    var ipX = marginLeft;
    var ipY = clientH - marginBottom;
    var iW = clientW - marginLeft - marginRight;
    var iH = clientH - marginBottom - marginTop;


    // copy elevations
    _chartElevations = [];
    if( chartData )
    {
        for( var i=0; i<chartData.length; i++ )
        {
            _chartElevations.push( chartData[i].elevation );
        }
    }

    if( _chartElevations.length < 2  )
    {
        invalidateAndRedraw(context);
        return;
    }



    var el1 = p1.elevation + p1.antennaElevation;
    var el2 = p2.elevation + p2.antennaElevation;   
    var elMax = Math.max(el1, el2);
    var anglDiv2 = virtualAng / 2.0;
    var antennaShift = elMax * Math.sin(anglDiv2);

    // calc scale
    var elevationStat = calcElevationStatistic(chartData, ang, EARTH_RADIUS);
    var avgElevation = elevationStat.avg;

    var posMin = Math.min(p1.elevation, p2.elevation, elevationStat.minSimple);
    var posMax = Math.max(p1.elevation + p1.antennaElevation, p2.elevation + p2.antennaElevation, elevationStat.maxEarth);

    var downShift = (useFullElevation)? 0 : Math.floor(posMin / 100.0) * 100 ;
    var fitPercent = (useFullElevation)? 0.8 : 0.95;
    var scaleH =  fitPercent * iH / ( posMax - downShift )  ;

    var antennaPadding = 20;
    var antennaPosFromCenter = iW / 2 - (antennaPadding + antennaShift*scaleH);
    var cntrW = ipX + iW / 2 ;

    // common params. copy to class member 
    _useEarthArc = useEarthArc;
    _earthRadius = EARTH_RADIUS;
    _downShift = downShift;
    _centerX = cntrW;
    _centerY = ipY;
    _scaleH = scaleH;
    _halfway = antennaPosFromCenter;
    _distance = distance;
    _ang = ang;
    _p1 = p1;
    _p2 = p2;
    _ipX = ipX;
    _ipY = ipY;
    _iW = iW;
    _iH = iH;
    _anglDiv2 = anglDiv2;
    _h = h;

    // clear markers
    _staticMarkerIndex = null;
    _dynamicMarkerIndex = null;

    // calc commin internal args
    prepareCommonData(p1, p2, chartData, cntrW, ipY, ang);


    invalidateAndRedraw(context);
}


//----------------------------------------------------------------
function invalidateAndRedraw(paramContext)
{
    var context = (paramContext)? paramContext : _canvas.getContext('2d');
    var clientW = context.canvas.clientWidth;
    var clientH = context.canvas.clientHeight;
    //
    var cntrW = _centerX;
    var antennaPosFromCenter = _halfway;


    //------------
    context.save();


    // clear screen + draw border
    context.beginPath();
    context.rect(0, 0, clientW, clientH);
    context.fillStyle = '#f0f0f0';
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = 'black';
    context.stroke();    

    // draw white field
    context.beginPath();
    context.rect(_ipX, _ipY, _iW, -_iH);
    context.fillStyle = '#ffffff';
    context.fill();

    if( _chartElevations.length == 0 )
    {
        context.restore();
        return;
    }


    // draw mesh
    drawMesh(context, _ipX, _ipY, _iW, _iH, _distance, cntrW, antennaPosFromCenter);


    context.save();
    context.beginPath();
    context.rect(_ipX, _ipY, _iW, -_iH); // define clip region
    context.clip();


    drawEndpoint2(context, _p1, cntrW - antennaPosFromCenter, _ipY, -1 * _anglDiv2);
    drawEndpoint2(context, _p2, cntrW + antennaPosFromCenter, _ipY, 1 * _anglDiv2);

    drawLinkBetweenAntennas(context, _p1, _p2, cntrW, _ipY, antennaPosFromCenter, _anglDiv2);
    
    if( _useEarthArc )
    {
        drawEarthArc(context, cntrW, _ipY, antennaPosFromCenter, _h * _scaleH);
    }

    drawElevationShape(context, _p1, _p2, cntrW, _ipY, antennaPosFromCenter, _ang, _earthRadius, _useEarthArc, false);

    drawStaticMarkerIfNeed(context);
    drawDynamicMarkerIfNeed(context);

    context.restore(); // clip region
    context.restore();

}


//----------------------------------------------------------------
this.hitProbe = function(mouseX, mouseY)
{
    var rect = _canvas.getBoundingClientRect();
    var x = mouseX - rect.left;
    var y = mouseY - rect.top;

    for( var i=0; i<_hitRegions.length; i++ )
    {
        var item = _hitRegions[i];
        if( item.x1 <= x && x <= item.x2 && item.y1 <= y && y <= item.y2 )
        {
            return item.obj;
        }
    }

    return null;
}


//----------------------------------------------------------------
this.showStaticMarkerByIndex = function(index)
{
    var prevIndex = _staticMarkerIndex;
    _staticMarkerIndex = index;
    if( prevIndex != index )
    {
        invalidateAndRedraw();
    }
}


//----------------------------------------------------------------
this.showDynamicMarkerByIndex = function(index)
{
    var prevIndex = _dynamicMarkerIndex;
    _dynamicMarkerIndex = index;
    if( prevIndex != index )
    {
        invalidateAndRedraw();
    }
}


} // end of global class-function HavElevationChart
