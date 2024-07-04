"use client";

import { useEffect, useRef, useState } from 'react';
import './globals.css';

const leftElevators = [[1, 5, 9], [1, 7, 12, 13, 14, 15]];
const rightElevators = [[1, 11], [1, 5, 8], [1, 6, 10]];
const elevators = [...leftElevators, ...rightElevators];

function calculateFatigue(steps, goingUp = true) {
  return goingUp ? steps * 1.5 : steps;
}

function findOptimalPathWithTransfers(start, end) {
  let optimalScore = Infinity;
  let optimalSteps = [];

  function searchPath(currentPath, currentScore, currentFloor, targetFloor, visited) {
    if (currentFloor === targetFloor) {
      if (currentScore < optimalScore) {
        optimalScore = currentScore;
        optimalSteps = [...currentPath];
      }
      return;
    }

    elevators.forEach((elevator, elevatorIndex) => {
      if (elevator.includes(currentFloor)) {
        elevator.forEach(nextFloor => {
          if (!visited.has(nextFloor)) {
            visited.add(nextFloor);
            let transfer = "";
            if (nextFloor !== currentFloor) {
              transfer = elevatorIndex < leftElevators.length ? "Trans_to_Left_EV" : "Trans_to_Right_EV";
            }
            if (nextFloor === targetFloor) {
              searchPath([...currentPath, transfer, nextFloor], currentScore, nextFloor, targetFloor, visited);
            } else {
              searchPath([...currentPath, transfer, nextFloor], currentScore, nextFloor, targetFloor, visited);
            }
            visited.delete(nextFloor);
          }
        });
      }
    });

    [-1, 1].forEach(direction => {
      const nextFloor = currentFloor + direction;
      if (nextFloor >= 1 && nextFloor <= 15 && !visited.has(nextFloor)) {
        visited.add(nextFloor);
        const additionalScore = calculateFatigue(1, direction > 0);
        searchPath([...currentPath, "Trans_to_Stairs", nextFloor], currentScore + additionalScore, nextFloor, targetFloor, visited);
        visited.delete(nextFloor);
      }
    });
  }

  searchPath(["Start", start], 0, start, end, new Set([start]));

  const compressedSteps = [];
  for (let i = 0; i < optimalSteps.length; i++) {
    if (optimalSteps[i] === "Trans_to_Stairs") {
      const startStair = optimalSteps[i - 1];
      while (i < optimalSteps.length && optimalSteps[i] === "Trans_to_Stairs") {
        i += 2;
      }
      const endStair = optimalSteps[i - 1];
      compressedSteps.push("Trans_to_Stairs", endStair);
    } else {
      compressedSteps.push(optimalSteps[i]);
    }
  }

  return [compressedSteps.slice(1), optimalScore];
}

export default function Home() {
  const numbers = Array.from({ length: 15 }, (_, i) => i + 1);
  const leftColumnRef = useRef(null);
  const rightColumnRef = useRef(null);
  const resultsRef = useRef(null);
  const [leftCenteredNumber, setLeftCenteredNumber] = useState(null);
  const [rightCenteredNumber, setRightCenteredNumber] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [resultSteps, setResultSteps] = useState([]);
  const [showButton, setShowButton] = useState(false);
  const [message, setMessage] = useState("스크롤 해서 갈 층을 골라봐요");

  const handleScroll = (columnRef, setCenteredNumber) => {
    const column = columnRef.current;
    if (column) {
      const arrowPosition = column.offsetHeight / 2;
      const children = Array.from(column.children).filter(child => !child.classList.contains('spacer'));
      let closestChild = null;
      let minDistance = Infinity;

      children.forEach((child) => {
        const childCenter = child.offsetTop + child.offsetHeight / 2 - column.scrollTop;
        const distance = Math.abs(childCenter - arrowPosition);
        if (distance < minDistance) {
          minDistance = distance;
          closestChild = child;
        }
      });

      if (closestChild) {
        const newCenteredNumber = parseInt(closestChild.textContent);
        setCenteredNumber(newCenteredNumber);
        setShowResults(false);
        updateMessageAndButton(newCenteredNumber, columnRef === leftColumnRef ? rightCenteredNumber : leftCenteredNumber);
      }
    }
  };

  const updateMessageAndButton = (left, right) => {
    if (left && right) {
      setShowButton(true);
      setMessage("아래 버튼으로 최적 경로를 확인해 봐요");
    } else {
      setShowButton(false);
      setMessage("스크롤 해서 갈 층을 골라봐요");
    }
  };

  useEffect(() => {
    const leftColumn = leftColumnRef.current;
    const rightColumn = rightColumnRef.current;

    const leftScrollHandler = () => handleScroll(leftColumnRef, setLeftCenteredNumber);
    const rightScrollHandler = () => handleScroll(rightColumnRef, setRightCenteredNumber);

    leftColumn.addEventListener('scroll', leftScrollHandler);
    rightColumn.addEventListener('scroll', rightScrollHandler);

    return () => {
      leftColumn.removeEventListener('scroll', leftScrollHandler);
      rightColumn.removeEventListener('scroll', rightScrollHandler);
    };
  }, [leftCenteredNumber, rightCenteredNumber]);

  useEffect(() => {
    if (showResults && resultsRef.current) {
      resultsRef.current.scrollTop = 0;
    }
  }, [showResults]);

  const renderNumber = (num, centeredNumber) => (
    <div key={num} className={`number ${num === centeredNumber ? 'centered' : ''}`}>
      {num}{num === centeredNumber ? 'F' : ''}
    </div>
  );

  const handleButtonClick = () => {
    const [optimalPath, fatigue] = findOptimalPathWithTransfers(leftCenteredNumber, rightCenteredNumber);
    const formattedSteps = formatOptimalPath(optimalPath, leftCenteredNumber, rightCenteredNumber);
    setResultSteps(formattedSteps);
    setShowResults(true);
  };

  const formatOptimalPath = (path, start, end) => {
    const labelMap = {
      "Start": "출발",
      "Trans_to_Right_EV": "건물 오른쪽 EV",
      "Trans_to_Left_EV": "건물 왼쪽 EV",
      "Trans_to_Stairs": "계단"
    };

    const iconMap = {
      "F": "https://i.imgur.com/2SgyhkH.jpg",
      "EV": "https://i.imgur.com/JhI74fW.jpg",
      "계단": "https://i.imgur.com/lXU8Moi.jpg"
    };

    const formattedSteps = [];
    let prevFloor = start;

    formattedSteps.push({ label: `${start}F`, value: "출발", icon: iconMap["F"] });

    for (let i = 0; i < path.length; i++) {
      const action = path[i];
      if (typeof action === 'number') {
        const currentFloor = action;
        const prevAction = path[i-1];
        const translatedLabel = labelMap[prevAction] || prevAction;

        if (["건물 오른쪽 EV", "건물 왼쪽 EV"].includes(translatedLabel)) {
          formattedSteps.push({
            label: translatedLabel,
            value: `${prevFloor}F → ${currentFloor}F 로 이동`,
            icon: iconMap["EV"]
          });
        } else if (translatedLabel === "계단") {
          const direction = currentFloor > prevFloor ? "올라가기" : "내려가기";
          formattedSteps.push({
            label: translatedLabel,
            value: `${prevFloor}F → ${currentFloor}F ${direction}`,
            icon: iconMap["계단"]
          });
        }
        prevFloor = currentFloor;
      }
    }

    formattedSteps.push({ label: `${end}F`, value: "도착", icon: iconMap["F"] });

    return formattedSteps;
  };

  return (
    <div className="container">
      <div className="scrollContainer">
        <div className="solid-rectangle top-solid"></div>
        <div className="gradient-rectangle top-gradient"></div>
        <div className="column" ref={leftColumnRef}>
          <div className="spacer"></div>
          {numbers.map(num => renderNumber(num, leftCenteredNumber))}
          <div className="spacer"></div>
        </div>
        <div className="arrow">→</div>
        <div className="column" ref={rightColumnRef}>
          <div className="spacer"></div>
          {numbers.map(num => renderNumber(num, rightCenteredNumber))}
          <div className="spacer"></div>
        </div>
        <div className="solid-rectangle bottom-solid"></div>
        <div className="gradient-rectangle bottom-gradient"></div>
        <button className={`center-button ${showButton ? 'visible' : ''}`} onClick={handleButtonClick}></button>
      </div>
      <div className="vertical-line"></div>
      <div className={`message ${!showResults ? 'visible' : ''}`}>
        <p>{message}</p>
      </div>
      <div className={`results ${showResults ? 'visible' : ''}`} ref={resultsRef}>
        <div className="results-content">
          <div className="spacer"></div>
          {resultSteps.map((step, index) => (
            <div key={index} className={`result-step ${index === 1 ? 'increased-margin' : ''}`}>
              <div className="result-icon-wrapper">
                {step.icon && <img src={step.icon} alt="" className={`result-icon ${step.label.includes('F') ? 'icon-f' : step.label.includes('EV') ? 'icon-ev' : 'icon-stairs'}`} />}
              </div>
              <div className="result-text">
                <h3 className="result-label">{step.label}</h3>
                <p className="result-value">{step.value}</p>
              </div>
            </div>
          ))}
          <div className="spacer"></div>
        </div>
      </div>
      <div className="right-gradient-rectangle right-top-gradient overlay"></div>
      <div className="right-gradient-rectangle right-bottom-gradient overlay"></div>
    </div>
  );
}